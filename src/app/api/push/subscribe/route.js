import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

// POST /api/push/subscribe — cihaz push aboneliğini kaydet
export async function POST(req) {
  try {
    const { subscription, userId, institutionId, role } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, error: 'Geçersiz abonelik verisi.' }, { status: 400 });
    }

    const subId = Buffer.from(subscription.endpoint).toString('base64').slice(-20);
    const docId = `sub-${subId}`;
    const nowStr = new Date().toISOString();

    // Firestore'a kaydet
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pushSubscriptions/${docId}?key=${FIREBASE_API_KEY}`;

    await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          endpoint:       { stringValue: subscription.endpoint },
          p256dh:         { stringValue: subscription.keys?.p256dh || '' },
          auth:           { stringValue: subscription.keys?.auth || '' },
          userId:         { stringValue: userId || '' },
          institutionId:  { stringValue: institutionId || '' },
          role:           { stringValue: role || 'teacher' },
          createdAt:      { stringValue: nowStr },
        },
      }),
    });

    return NextResponse.json({ success: true, message: 'Push aboneliği kaydedildi.' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — aboneliği sil
export async function DELETE(req) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ success: false, error: 'endpoint gerekli.' }, { status: 400 });

    const subId = Buffer.from(endpoint).toString('base64').slice(-20);
    const docId = `sub-${subId}`;

    await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pushSubscriptions/${docId}?key=${FIREBASE_API_KEY}`,
      { method: 'DELETE' }
    );

    return NextResponse.json({ success: true, message: 'Abonelik silindi.' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
