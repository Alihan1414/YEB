import { NextResponse } from 'next/server';

// Firebase config fallback (public client-side keys, not secrets)
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function POST(req) {
  try {
    const { institutionId, disabled } = await req.json();

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Kurum ID zorunludur.' }, { status: 400 });
    }

    // 1. Fetch all users from Firestore
    const usersRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}`
    );
    if (!usersRes.ok) {
      return NextResponse.json({ success: false, error: 'Kullanıcı listesi alınamadı.' }, { status: 500 });
    }

    const data = await usersRes.json();
    const list = (data.documents || []).map(doc => {
      const f = doc.fields || {};
      return {
        id: doc.name.split('/').pop(),
        institutionId: f.institutionId?.stringValue || 'yamanevler',
      };
    });

    const instUsers = list.filter(u => u.institutionId === institutionId);

    // 2. Update status of each user
    await Promise.all(
      instUsers.map(u =>
        fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${u.id}?updateMask.fieldPaths=disabled&key=${FIREBASE_API_KEY}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { disabled: { booleanValue: disabled } } }),
          }
        )
      )
    );

    return NextResponse.json({
      success: true,
      message: `Kurum ${disabled ? 'devre dışı bırakıldı' : 'aktifleştirildi'}.`
    });

  } catch (error) {
    console.error("Update institution status API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
