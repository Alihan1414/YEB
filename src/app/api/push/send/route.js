import { NextResponse } from 'next/server';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL       = process.env.VAPID_EMAIL || 'mailto:admin@talebe-takip.com';

// POST /api/push/send — kuruma ait tüm abonelere bildirim gönder
export async function POST(req) {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('[Push] VAPID keys not configured. Skipping push.');
      return NextResponse.json({ success: false, error: 'VAPID keys not set.' }, { status: 500 });
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const { institutionId, title, body, url } = await req.json();

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'institutionId gerekli.' }, { status: 400 });
    }

    // Firestore'dan kuruma ait tüm aboneleri çek
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pushSubscriptions?key=${FIREBASE_API_KEY}`;
    const fsRes = await fetch(fsUrl, { cache: 'no-store' });
    const fsData = await fsRes.json();
    const docs = fsData.documents || [];

    // Bu kuruma ait aboneleri filtrele
    const subscribers = docs
      .map(doc => {
        const f = doc.fields || {};
        return {
          endpoint:      f.endpoint?.stringValue,
          p256dh:        f.p256dh?.stringValue,
          auth:          f.auth?.stringValue,
          institutionId: f.institutionId?.stringValue,
        };
      })
      .filter(s => s.institutionId === institutionId && s.endpoint && s.p256dh && s.auth);

    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Kayıtlı abone yok.' });
    }

    const payload = JSON.stringify({
      title:  title  || '🔔 Yeni İzin Talebi',
      body:   body   || 'Yeni bir izin talebi geldi. Lütfen inceleyin.',
      url:    url    || '/izinler',
    });

    let sent = 0;
    const staleEndpoints = [];

    await Promise.all(
      subscribers.map(async (sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          await webpush.sendNotification(pushSub, payload);
          sent++;
        } catch (err) {
          // 410 Gone = abonelik süresi dolmuş → temizle
          if (err.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          } else {
            console.warn('[Push] Send error:', err.message);
          }
        }
      })
    );

    // Süresi dolmuş abonelikleri sil
    if (staleEndpoints.length > 0) {
      await Promise.all(
        staleEndpoints.map(async (endpoint) => {
          const subId = Buffer.from(endpoint).toString('base64').slice(-20);
          await fetch(
            `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pushSubscriptions/sub-${subId}?key=${FIREBASE_API_KEY}`,
            { method: 'DELETE' }
          );
        })
      );
    }

    return NextResponse.json({ success: true, sent, total: subscribers.length });

  } catch (error) {
    console.error('[Push] send error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
