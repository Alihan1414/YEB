import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { success: false, error: 'Firebase env variables eksik.' },
      { status: 500 }
    );
  }

  const results = [];

  // Define seed accounts
  const accounts = [
    {
      email:           'admin@yeb.local',
      password:        'admin14',
      username:        'admin',
      name:            'Sistem Yöneticisi',
      role:            'super_admin',
      institutionId:   'platform',
      institutionName: 'Sistem Yönetimi',
    },
    {
      email:           'yeb@2026.com',
      password:        'enderun bilişim',
      username:        'yeb2026',
      name:            'Yamanevler Admin',
      role:            'admin',
      institutionId:   'yamanevler',
      institutionName: 'Yamanevler Enderun Bilişim',
    }
  ];

  for (const acc of accounts) {
    try {
      // 1. Firebase Auth: Create user
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: acc.email, password: acc.password, returnSecureToken: true }),
        }
      );
      const signUpData = await signUpRes.json();

      if (signUpData.error) {
        if (signUpData.error.message === 'EMAIL_EXISTS') {
          results.push({ email: acc.email, status: 'Zaten mevcut' });
          continue;
        }
        results.push({ email: acc.email, status: 'Hata', error: signUpData.error.message });
        continue;
      }

      const { localId: uid, idToken } = signUpData;

      // 2. Firestore: Save user document
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
              name:            { stringValue: acc.name },
              email:           { stringValue: acc.email },
              username:        { stringValue: acc.username },
              role:            { stringValue: acc.role },
              institutionId:   { stringValue: acc.institutionId },
              institutionName: { stringValue: acc.institutionName },
            },
          }),
        }
      );

      results.push({ email: acc.email, status: 'Başarıyla oluşturuldu' });
    } catch (err) {
      results.push({ email: acc.email, status: 'Hata', error: err.message });
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Seed işlemi tamamlandı.',
    results,
  });
}
