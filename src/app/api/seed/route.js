import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey  = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const email   = 'yeb@2026.com';
  const password = 'enderun bilişim';

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { success: false, error: 'Firebase env variables missing on server.' },
      { status: 500 }
    );
  }

  try {
    // ── 1. Firebase Auth REST: Create user ───────────────────────────────────
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const signUpData = await signUpRes.json();

    if (signUpData.error) {
      if (signUpData.error.message === 'EMAIL_EXISTS') {
        return NextResponse.json({
          success: true,
          message: 'Hesap zaten mevcut. Giriş yapabilirsiniz.',
          email,
          password,
        });
      }
      return NextResponse.json(
        { success: false, error: signUpData.error.message },
        { status: 400 }
      );
    }

    const { localId: uid, idToken } = signUpData;

    // ── 2. Firestore REST: Save user document ─────────────────────────────────
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            name:  { stringValue: 'Enderun Bilişim Yöneticisi' },
            email: { stringValue: email },
            role:  { stringValue: 'admin' },
          },
        }),
      }
    );

    return NextResponse.json({
      success: true,
      message: 'YEB yönetici hesabı başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz.',
      email,
      password,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
