import { NextResponse } from 'next/server';

// Firebase config fallback (public client-side keys, not secrets)
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'E-posta ve şifre gereklidir.' }, { status: 400 });
    }

    const trimmedEmail = email.trim();

    // 1. Firebase Auth: sign in via REST API
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password, returnSecureToken: true }),
      }
    );
    const signInData = await signInRes.json();

    if (signInData.error) {
      return NextResponse.json(
        { success: false, error: 'E-posta veya şifre hatalı.' },
        { status: 401 }
      );
    }

    const { localId: uid, idToken } = signInData;

    // 2. Fetch Firestore profile
    const profileRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`,
      { headers: { 'Authorization': `Bearer ${idToken}` }, cache: 'no-store' }
    );

    let profile = null;

    if (profileRes.ok) {
      const profileData = await profileRes.json();
      if (profileData.fields) {
        const f = profileData.fields;
        const isDisabled = f.disabled?.booleanValue === true;
        if (isDisabled) {
          return NextResponse.json(
            { success: false, error: 'Bu hesap devre dışı bırakılmıştır.' },
            { status: 403 }
          );
        }
        profile = {
          uid,
          name:            f.name?.stringValue            || '',
          email:           f.email?.stringValue           || trimmedEmail,
          role:            f.role?.stringValue            || 'teacher',
          institutionId:   f.institutionId?.stringValue   || 'yamanevler',
          institutionName: f.institutionName?.stringValue || 'Yamanevler Enderun Bilişim',
        };
      }
    }

    // 3. Fallback: construct profile from email if Firestore document not found
    if (!profile) {
      const isSuper = trimmedEmail === 'admin@yeb.local';
      const isYeb   = trimmedEmail === 'yeb@2026.com';
      profile = {
        uid,
        name:            isSuper ? 'Sistem Yöneticisi' : (isYeb ? 'Yamanevler Admin' : trimmedEmail),
        email:           trimmedEmail,
        role:            isSuper ? 'super_admin' : 'admin',
        institutionId:   isSuper ? 'platform' : (isYeb ? 'yamanevler' : 'unknown'),
        institutionName: isSuper ? 'Sistem Yönetimi' : (isYeb ? 'Yamanevler Enderun Bilişim' : 'Bilinmeyen Kurum'),
      };
    }

    return NextResponse.json({ success: true, profile });

  } catch (error) {
    console.error("Server-side login API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
