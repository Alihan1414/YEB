import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId') || 'yamanevler';

    const dbData = readDb();
    
    // Default structure
    if (!dbData.leaveSettings) {
      dbData.leaveSettings = {};
    }

    const settings = dbData.leaveSettings[institutionId] || {
      enabled: false,
      assignedTeacherId: ''
    };

    // Try fetching from Firestore if we want to sync (optional, we can just use local DB for simplicity)
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveSettings/${institutionId}?key=${FIREBASE_API_KEY}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.fields) {
          const enabled = data.fields.enabled?.booleanValue || false;
          const assignedTeacherId = data.fields.assignedTeacherId?.stringValue || '';
          settings.enabled = enabled;
          settings.assignedTeacherId = assignedTeacherId;
        }
      }
    } catch (err) {
      console.warn("Firestore leave settings fetch failed, using local fallback:", err.message);
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("GET Leave settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { institutionId, enabled, assignedTeacherId } = await req.json();

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Kurum ID gereklidir.' }, { status: 400 });
    }

    const instId = institutionId.trim().toLowerCase();

    // 1. Update local DB
    const dbData = readDb();
    if (!dbData.leaveSettings) {
      dbData.leaveSettings = {};
    }

    dbData.leaveSettings[instId] = {
      enabled: !!enabled,
      assignedTeacherId: assignedTeacherId || ''
    };

    writeDb(dbData);

    // 2. Try Firestore update
    try {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveSettings/${instId}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              enabled:           { booleanValue: !!enabled },
              assignedTeacherId: { stringValue: assignedTeacherId || '' },
            },
          }),
        }
      );
    } catch (err) {
      console.warn("Firestore leave settings save failed, saved locally:", err.message);
    }

    return NextResponse.json({
      success: true,
      settings: dbData.leaveSettings[instId]
    });

  } catch (error) {
    console.error("POST Leave settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
