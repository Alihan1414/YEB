import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

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

    // 1. Update in local DB
    const dbData = readDb();
    const requests = dbData.leaveRequests || [];
    const idx = requests.findIndex(r => r.id === id);

    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Talep bulunamadı.' }, { status: 404 });
    }

    requests[idx].status = status;
    requests[idx].respondedBy = respondedBy || 'Sistem Yöneticisi';
    requests[idx].respondedAt = nowStr;
    updatedRequest = requests[idx];

    dbData.leaveRequests = requests;
    writeDb(dbData);

    // 2. Update in Firestore
    try {
      // Fetch existing Firestore doc to merge fields properly or update them
      await fetch(
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
    } catch (err) {
      console.warn("Firestore update failed in leave PATCH, saved locally:", err.message);
    }

    return NextResponse.json({ success: true, request: updatedRequest });

  } catch (error) {
    console.error("PATCH Leave request error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
