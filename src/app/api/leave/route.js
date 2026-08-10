import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId') || 'yamanevler';

    let requests = [];

    // 1. Try to read from local DB
    try {
      const dbData = readDb();
      const localRequests = dbData.leaveRequests || [];
      requests = localRequests.filter(r => r.institutionId === institutionId);
    } catch (err) {
      console.warn("Local DB fetch failed in leave GET:", err.message);
    }

    // 2. Try to read from Firestore and merge/sync
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveRequests?key=${FIREBASE_API_KEY}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        docs.forEach(doc => {
          const f = doc.fields || {};
          const rInstId = f.institutionId?.stringValue || '';
          
          if (rInstId === institutionId) {
            const id = doc.name.split('/').pop();
            const email = f.email?.stringValue || '';
            const item = {
              id,
              studentName:       f.studentName?.stringValue       || '',
              parentPhone:       f.parentPhone?.stringValue       || '',
              startDate:         f.startDate?.stringValue         || '',
              startTime:         f.startTime?.stringValue         || '',
              endDate:           f.endDate?.stringValue           || '',
              endTime:           f.endTime?.stringValue           || '',
              reason:            f.reason?.stringValue            || '',
              status:            f.status?.stringValue            || 'pending', // 'pending' | 'approved' | 'rejected'
              institutionId:     rInstId,
              created_at:        f.created_at?.stringValue        || '',
              respondedBy:       f.respondedBy?.stringValue       || '',
              respondedAt:       f.respondedAt?.stringValue       || ''
            };
            
            // Add if not already present
            if (!requests.some(r => r.id === id)) {
              requests.push(item);
            } else {
              // Update local state with firestore if different
              const idx = requests.findIndex(r => r.id === id);
              if (idx !== -1) {
                requests[idx] = { ...requests[idx], ...item };
              }
            }
          }
        });
      }
    } catch (err) {
      console.warn("Firestore fetch failed in leave GET:", err.message);
    }

    // Sort requests by date descending
    requests.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("GET Leave requests error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const {
      studentName, parentPhone, startDate, startTime, endDate, endTime, reason, institutionId
    } = await req.json();

    if (!studentName || !parentPhone || !startDate || !reason || !institutionId) {
      return NextResponse.json({ success: false, error: 'Lütfen zorunlu alanları doldurun.' }, { status: 400 });
    }

    const instId = institutionId.trim().toLowerCase();

    // Check if leave system is enabled for this institution
    const dbData = readDb();
    const settings = (dbData.leaveSettings && dbData.leaveSettings[instId]) || { enabled: false };
    if (!settings.enabled) {
      return NextResponse.json({ success: false, error: 'İzin başvuruları şu anda kapalıdır.' }, { status: 400 });
    }

    const requestId = `leave-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowStr = new Date().toISOString();

    const newRequest = {
      id: requestId,
      studentName: studentName.trim(),
      parentPhone: parentPhone.replace(/\s+/g, ''),
      startDate,
      startTime: startTime || '',
      endDate: endDate || startDate,
      endTime: endTime || '',
      reason: reason.trim(),
      status: 'pending',
      institutionId: instId,
      created_at: nowStr,
      respondedBy: '',
      respondedAt: ''
    };

    // 1. Save locally
    if (!dbData.leaveRequests) {
      dbData.leaveRequests = [];
    }
    dbData.leaveRequests.push(newRequest);
    writeDb(dbData);

    // 2. Save to Firestore
    try {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveRequests/${requestId}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              studentName:       { stringValue: newRequest.studentName },
              parentPhone:       { stringValue: newRequest.parentPhone },
              startDate:         { stringValue: newRequest.startDate },
              startTime:         { stringValue: newRequest.startTime },
              endDate:           { stringValue: newRequest.endDate },
              endTime:           { stringValue: newRequest.endTime },
              reason:            { stringValue: newRequest.reason },
              status:            { stringValue: newRequest.status },
              institutionId:     { stringValue: newRequest.institutionId },
              created_at:        { stringValue: newRequest.created_at },
              respondedBy:       { stringValue: '' },
              respondedAt:       { stringValue: '' }
            },
          }),
        }
      );
    } catch (err) {
      console.warn("Firestore save failed in leave POST, saved locally:", err.message);
    }

    // 3. Push bildirimi gönder (uygulama kapalı olsa bile)
    try {
      const host = req.headers.get('host') || 'localhost:3000';
      const proto = host.includes('localhost') ? 'http' : 'https';
      await fetch(`${proto}://${host}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: instId,
          title: '🔔 Yeni İzin Talebi',
          body: `${newRequest.studentName} için izin talebi geldi. Sebep: ${newRequest.reason}`,
          url: '/izinler',
        }),
      });
    } catch (pushErr) {
      console.warn("Push notification failed (non-critical):", pushErr.message);
    }

    return NextResponse.json({ success: true, request: newRequest });

  } catch (error) {
    console.error("POST Leave request error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
