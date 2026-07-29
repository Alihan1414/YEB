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

    // Normalize: Firebase Auth requires a valid TLD.
    // e.g. kiliaslan@2026 → kiliaslan@2026.com
    const normalizeEmail = (addr) => {
      const parts = addr.split('@');
      if (parts.length === 2 && !parts[1].includes('.')) {
        return `${parts[0]}@${parts[1]}.com`;
      }
      return addr;
    };
    const firebaseEmail = normalizeEmail(trimmedEmail);

    let profile = null;
    let uid = null;

    // 1. Try Firebase Auth
    try {
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: firebaseEmail, password, returnSecureToken: true }),
        }
      );

      const signInData = await signInRes.json();

      if (signInData && !signInData.error) {
        uid = signInData.localId;
        const idToken = signInData.idToken;

        // Fetch Firestore profile
        const profileRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`,
          { headers: { 'Authorization': `Bearer ${idToken}` }, cache: 'no-store' }
        );

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
      }
    } catch (fbErr) {
      console.warn("Firebase Auth API call failed, will fallback:", fbErr.message);
    }

    // 2. Fallback: check local database
    if (!profile) {
      try {
        const { readDb } = require('@/lib/db');
        const dbData = readDb();
        const localUsers = dbData.users || [];
        const foundLocal = localUsers.find(
          u => u.email && u.email.toLowerCase() === trimmedEmail.toLowerCase()
        );

        if (foundLocal) {
          // Verify password (plain text check for local mock accounts)
          if (foundLocal.password === password) {
            if (foundLocal.disabled === true) {
              return NextResponse.json(
                { success: false, error: 'Bu hesap devre dışı bırakılmıştır.' },
                { status: 403 }
              );
            }
            profile = {
              uid: foundLocal.id || foundLocal.email,
              name:            foundLocal.name || '',
              email:           foundLocal.email || trimmedEmail,
              role:            foundLocal.role || 'teacher',
              institutionId:   foundLocal.institutionId || 'yamanevler',
              institutionName: foundLocal.institutionName || 'Yamanevler Enderun Bilişim',
            };
          }
        }
      } catch (dbErr) {
        console.error("Local DB auth fallback failed:", dbErr);
      }
    }

    // 3. Fallback: seed accounts if not matched but matches hardcoded values
    if (!profile) {
      const isSuper = (trimmedEmail === 'alihan@2026' || trimmedEmail === 'admin@yeb.local') && (password === 'alihan1434' || password === 'admin123');
      const isYeb   = trimmedEmail === 'yeb@2026.com' && password === 'yeb2026';
      if (isSuper || isYeb) {
        profile = {
          uid: isSuper ? 'super-admin' : 'yeb-admin',
          name:            isSuper ? 'Sistem Yöneticisi' : 'Yamanevler Admin',
          email:           trimmedEmail,
          role:            isSuper ? 'super_admin' : 'admin',
          institutionId:   isSuper ? 'platform' : 'yamanevler',
          institutionName: isSuper ? 'Sistem Yönetimi' : 'Yamanevler Enderun Bilişim',
        };
      }
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'E-posta/Kullanıcı adı veya şifre hatalı.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, profile });

  } catch (error) {
    console.error("Server-side login API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
