import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { status, respondedBy } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'İstek ID ve durum gereklidir.' }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ success: false, error: 'Geçersiz durum değeri.' }, { status: 400 });
    }

    const nowStr = new Date().toISOString();
    let updatedRequest = null;

    // 1. Update in Firestore
    try {
      const fsRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveRequests/${id}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=status&updateMask.fieldPaths=respondedBy&updateMask.fieldPaths=respondedAt`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              status:      { stringValue: status },
              respondedBy: { stringValue: respondedBy || 'Sistem Yöneticisi' },
              respondedAt: { stringValue: nowStr }
            },
          }),
        }
      );
      if (fsRes.ok) {
        const fsData = await fsRes.json();
        const f = fsData.fields || {};
        updatedRequest = {
          id,
          studentName: f.studentName?.stringValue || '',
          parentPhone: f.parentPhone?.stringValue || '',
          startDate: f.startDate?.stringValue || '',
          startTime: f.startTime?.stringValue || '',
          endDate: f.endDate?.stringValue || '',
          endTime: f.endTime?.stringValue || '',
          reason: f.reason?.stringValue || '',
          status: f.status?.stringValue || status,
          respondedBy: f.respondedBy?.stringValue || respondedBy,
          respondedAt: f.respondedAt?.stringValue || nowStr
        };
      }
    } catch (err) {
      console.warn("Firestore update in leave PATCH:", err.message);
    }

    // 2. Update in local DB
    try {
      const dbData = readDb();
      const requests = dbData.leaveRequests || [];
      const idx = requests.findIndex(r => r.id === id);
      if (idx !== -1) {
        requests[idx].status = status;
        requests[idx].respondedBy = respondedBy || 'Sistem Yöneticisi';
        requests[idx].respondedAt = nowStr;
        if (!updatedRequest) updatedRequest = requests[idx];
        dbData.leaveRequests = requests;
        writeDb(dbData);
      }
    } catch (err) {
      console.warn("Local DB update in leave PATCH:", err.message);
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest || { id, status, respondedBy, respondedAt: nowStr }
    });

  } catch (error) {
    console.error("PATCH Leave request error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
