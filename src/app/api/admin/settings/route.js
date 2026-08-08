import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId') || 'yamanevler';

    const dbData = readDb();
    
    // Default structure
    if (!dbData.generalSettings) {
      dbData.generalSettings = {};
    }

    const settings = dbData.generalSettings[institutionId] || {
      weeklyGoal: 3,
      notificationsEnabled: false
    };

    // Try fetching from Firestore
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/generalSettings/${institutionId}?key=${FIREBASE_API_KEY}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.fields) {
          const weeklyGoal = data.fields.weeklyGoal?.integerValue ? parseInt(data.fields.weeklyGoal.integerValue, 10) : 3;
          const notificationsEnabled = data.fields.notificationsEnabled?.booleanValue || false;
          settings.weeklyGoal = weeklyGoal;
          settings.notificationsEnabled = notificationsEnabled;
        }
      }
    } catch (err) {
      console.warn("Firestore general settings fetch failed, using local fallback:", err.message);
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("GET general settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { institutionId, weeklyGoal, notificationsEnabled } = await req.json();

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Kurum ID gereklidir.' }, { status: 400 });
    }

    const instId = institutionId.trim().toLowerCase();

    // 1. Update local DB
    const dbData = readDb();
    if (!dbData.generalSettings) {
      dbData.generalSettings = {};
    }

    const goal = typeof weeklyGoal === 'number' ? weeklyGoal : parseInt(weeklyGoal, 10) || 3;

    dbData.generalSettings[instId] = {
      weeklyGoal: goal,
      notificationsEnabled: !!notificationsEnabled
    };

    writeDb(dbData);

    // 2. Try Firestore update
    try {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/generalSettings/${instId}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              weeklyGoal:           { integerValue: goal },
              notificationsEnabled: { booleanValue: !!notificationsEnabled },
            },
          }),
        }
      );
    } catch (err) {
      console.warn("Firestore general settings save failed, saved locally:", err.message);
    }

    return NextResponse.json({
      success: true,
      settings: dbData.generalSettings[instId]
    });

  } catch (error) {
    console.error("POST general settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
