import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { normalizeInstitutionId } from '@/lib/institution';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'bolu-kilicaslan';
    const institutionId = normalizeInstitutionId(rawInstId);
    const authHeader = req.headers.get('authorization');
    const headers = {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {})
    };

    let settings = { enabled: true, assignedTeacherId: '' };

    // 1. First read directly from Firestore (with 1.2s timeout)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveSettings/${institutionId}?key=${FIREBASE_API_KEY}`,
        { headers, cache: 'no-store', signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.fields) {
          const assignedTeacherId = data.fields.assignedTeacherId?.stringValue || '';
          return NextResponse.json({
            success: true,
            settings: { enabled: true, assignedTeacherId }
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
        settings = { ...dbData.leaveSettings[institutionId], enabled: true };
      }
    } catch {}

    return NextResponse.json({ success: true, settings: { ...settings, enabled: true } });
  } catch (error) {
    console.error("GET Leave settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { institutionId, assignedTeacherId } = await req.json();
    const authHeader = req.headers.get('authorization');
    const headers = {
      'Content-Type': 'application/json',
      ...(authHeader ? { 'Authorization': authHeader } : {})
    };

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Kurum ID gereklidir.' }, { status: 400 });
    }

    const instId = normalizeInstitutionId(institutionId);
    // İzin yönetimi bütün kurumlarda daimi olarak açıktır, kapatılamaz!
    const isEnabled = true;

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
              enabled:           { booleanValue: true },
              assignedTeacherId: { stringValue: assignedTeacherId || '' },
            },
          }),
        }
      );
      if (!fsRes.ok) {
        console.warn("Firestore leave settings PATCH response not OK:", fsRes.status);
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
