import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'yamanevler';
    const institutionId = rawInstId.trim().toLowerCase();

    const dbData = readDb();
    
    if (!dbData.leaveSettings) {
      dbData.leaveSettings = {};
    }

    let settings = dbData.leaveSettings[institutionId];

    // Try fetching from Firestore if local DB doesn't have it or as optional sync
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveSettings/${institutionId}?key=${FIREBASE_API_KEY}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.fields) {
          const enabled = data.fields.enabled?.booleanValue !== undefined ? data.fields.enabled.booleanValue : (settings?.enabled ?? false);
          const assignedTeacherId = data.fields.assignedTeacherId?.stringValue || settings?.assignedTeacherId || '';
          settings = { enabled, assignedTeacherId };
          dbData.leaveSettings[institutionId] = settings;
          writeDb(dbData);
        }
      }
    } catch (err) {
      console.warn("Firestore leave settings fetch failed, using local fallback:", err.message);
    }

    if (!settings) {
      settings = { enabled: false, assignedTeacherId: '' };
      dbData.leaveSettings[institutionId] = settings;
      writeDb(dbData);
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

    const newSettings = {
      enabled: Boolean(enabled),
      assignedTeacherId: assignedTeacherId || ''
    };

    dbData.leaveSettings[instId] = newSettings;
    writeDb(dbData);

    // 2. Try Firestore update with proper updateMask
    try {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveSettings/${instId}?updateMask.fieldPaths=enabled&updateMask.fieldPaths=assignedTeacherId&key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              enabled:           { booleanValue: Boolean(enabled) },
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
      settings: newSettings
    });

  } catch (error) {
    console.error("POST Leave settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
