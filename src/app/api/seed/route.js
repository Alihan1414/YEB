import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Admin credentials
  const email    = 'admin@yeb.local';
  const password = 'admin14';
  const username = 'admin'; // display username

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { success: false, error: 'Firebase env variables eksik.' },
      { status: 500 }
    );
  }

  try {
    // ── 1. Firebase Auth: Create admin user ──────────────────────────────────
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
          message: 'Admin hesabı zaten mevcut. Giriş yapabilirsiniz.',
          username,
          password,
        });
      }
      return NextResponse.json(
        { success: false, error: signUpData.error.message },
        { status: 400 }
      );
    }

    const { localId: uid, idToken } = signUpData;

    // ── 2. Firestore: Save user document ─────────────────────────────────────
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
            name:            { stringValue: 'Sistem Yöneticisi' },
            email:           { stringValue: email },
            username:        { stringValue: username },
            role:            { stringValue: 'admin' },
            institutionId:   { stringValue: 'yamanevler' },
            institutionName: { stringValue: 'Yamanevler Enderun Bilişim' },
          },
        }),
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin hesabı başarıyla oluşturuldu!',
      username,
      password,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
