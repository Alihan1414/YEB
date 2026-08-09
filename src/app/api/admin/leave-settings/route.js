import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

function normalizeInstitutionId(id) {
  if (!id) return 'yamanevler';
  const clean = id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('kilicaslan')) return 'bolu-kilicaslan';
  if (clean.includes('erenler') || clean.includes('cinardere')) return 'cinardere-erenler';
  if (clean.includes('pendik')) return 'pendik-talebe-yurdu';
  if (clean.includes('yamanevler') || clean === 'yeb') return 'yamanevler';
  return id.trim().toLowerCase();
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'yamanevler';
    const institutionId = normalizeInstitutionId(rawInstId);
    const authHeader = req.headers.get('authorization');
    const headers = {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {})
    };

    let settings = { enabled: true, assignedTeacherId: '' };

    // 1. First read directly from Firestore
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveSettings/${institutionId}?key=${FIREBASE_API_KEY}`,
        { headers, cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.fields) {
          const enabled = data.fields.enabled?.booleanValue !== undefined ? data.fields.enabled.booleanValue : true;
          const assignedTeacherId = data.fields.assignedTeacherId?.stringValue || '';
          return NextResponse.json({
            success: true,
            settings: { enabled: Boolean(enabled), assignedTeacherId }
          });
        }
      }
    } catch (err) {
      console.warn("Firestore leave settings fetch failed, checking local:", err.message);
    }

    // 2. Fallback local DB
    try {
      const dbData = readDb();
      if (dbData.leaveSettings && dbData.leaveSettings[institutionId]) {
        settings = dbData.leaveSettings[institutionId];
      }
    } catch {}

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("GET Leave settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { institutionId, enabled, assignedTeacherId } = await req.json();
    const authHeader = req.headers.get('authorization');
    const headers = {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {})
    };

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Kurum ID gereklidir.' }, { status: 400 });
    }

    const instId = institutionId.trim().toLowerCase();
    const isEnabled = Boolean(enabled);

    // 1. Update local DB
    const dbData = readDb();
    if (!dbData.leaveSettings) {
      dbData.leaveSettings = {};
    }

    dbData.leaveSettings[instId] = {
      enabled: isEnabled,
      assignedTeacherId: assignedTeacherId || ''
    };

    writeDb(dbData);

    // 2. Update Firestore
    try {
      const fsRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveSettings/${instId}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            fields: {
              enabled:           { booleanValue: isEnabled },
              assignedTeacherId: { stringValue: assignedTeacherId || '' },
            },
          }),
        }
      );
      if (!fsRes.ok) {
        console.warn("Firestore leave settings PATCH response not OK:", fsRes.status, await fsRes.text());
      }
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
