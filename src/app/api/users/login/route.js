import { NextResponse } from 'next/server';

// Firebase config fallback (public client-side keys, not secrets)
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

// Helper: get institution branding from local DB
function getInstBranding(instId) {
  try {
    const { readDb } = require('@/lib/db');
    const dbData = readDb();
    const inst = (dbData.institutions || []).find(i => i.id === instId);
    if (inst) {
      return {
        logoUrl: inst.logoUrl || '',
        primaryColor: inst.primaryColor || '#06429c',
        enabledModules: inst.enabledModules || { ai: true, leave: true, tv: true, weekly: true },
        institutionName: inst.name || instId,
      };
    }
  } catch {}
  return {
    logoUrl: '',
    primaryColor: '#06429c',
    enabledModules: { ai: true, leave: true, tv: true, weekly: true },
    institutionName: null,
  };
}

// Normalize Turkish characters to ASCII equivalents for mobile keyboard compatibility
// e.g. "kılıçaslan" → "kilicaslan"
function turkishToAscii(str) {
  return str
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U');
}

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
            const instId = f.institutionId?.stringValue || 'unknown';
            const branding = getInstBranding(instId);
            const instName = f.institutionName?.stringValue || branding.institutionName || instId;

            profile = {
              uid,
              name:            f.name?.stringValue            || '',
              email:           f.email?.stringValue           || trimmedEmail,
              role:            f.role?.stringValue            || 'teacher',
              institutionId:   instId,
              institutionName: instName,
              logoUrl:         f.logoUrl?.stringValue         || branding.logoUrl,
              primaryColor:    f.primaryColor?.stringValue    || branding.primaryColor,
              enabledModules:  branding.enabledModules,
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
        // Normalize both sides to ASCII to handle Turkish characters from mobile keyboards
        // e.g. phone typing "kilicaslan" matches DB entry "kılıçaslan"
        const normalizedInput = turkishToAscii(trimmedEmail.toLowerCase());
        const foundLocal = localUsers.find(u => {
          if (!u.email) return false;
          const normalizedDbEmail = turkishToAscii(u.email.toLowerCase());
          // Match full email OR just the local-part before @ (so "kilicaslan" matches "kilicaslan@2026")
          return normalizedDbEmail === normalizedInput ||
                 normalizedDbEmail.split('@')[0] === normalizedInput;
        });

        if (foundLocal) {
          // Verify password — normalize Turkish chars on both sides so mobile English keyboards work
          // e.g. user typing "bolukilicaslan" matches DB "bolukılıçaslan"
          if (turkishToAscii(foundLocal.password || '') === turkishToAscii(password)) {
            if (foundLocal.disabled === true) {
              return NextResponse.json(
                { success: false, error: 'Bu hesap devre dışı bırakılmıştır.' },
                { status: 403 }
              );
            }
            const instId = foundLocal.institutionId || 'unknown';
            const branding = getInstBranding(instId);
            const instName = foundLocal.institutionName || branding.institutionName || instId;

            profile = {
              uid: foundLocal.id || foundLocal.email,
              name:            foundLocal.name || '',
              email:           foundLocal.email || trimmedEmail,
              role:            foundLocal.role || 'teacher',
              institutionId:   instId,
              institutionName: instName,
              logoUrl:         foundLocal.logoUrl         || branding.logoUrl,
              primaryColor:    foundLocal.primaryColor    || branding.primaryColor,
              enabledModules:  branding.enabledModules,
            };
          }
        }
      } catch (dbErr) {
        console.error("Local DB auth fallback failed:", dbErr);
      }
    }

    // 3. Fallback: seed accounts (super admin only)
    if (!profile) {
      const isSuper = (trimmedEmail === 'alihan@2026' || trimmedEmail === 'admin@yeb.local') &&
                      (password === 'alihan1434' || password === 'admin123');
      if (isSuper) {
        profile = {
          uid: 'super-admin',
          name: 'Sistem Yöneticisi',
          email: 'admin@yeb.local',
          role: 'super_admin',
          institutionId: 'platform',
          institutionName: 'Sistem Yönetimi',
          logoUrl: '',
          primaryColor: '#06429c',
          enabledModules: { ai: true, leave: true, tv: true, weekly: true },
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
