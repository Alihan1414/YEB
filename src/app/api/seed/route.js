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
      let uid = '';
      let idToken = '';
      let isNew = true;

      // 1. Firebase Auth: Try to create user
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
          // If already exists, log in to get the UID and idToken so we can update Firestore
          const signInRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: acc.email, password: acc.password, returnSecureToken: true }),
            }
          );
          const signInData = await signInRes.json();
          if (signInData.error) {
            results.push({ email: acc.email, status: 'Mevcut ama giriş hatası', error: signInData.error.message });
            continue;
          }
          uid = signInData.localId;
          idToken = signInData.idToken;
          isNew = false;
        } else {
          results.push({ email: acc.email, status: 'Kayıt hatası', error: signUpData.error.message });
          continue;
        }
      } else {
        uid = signUpData.localId;
        idToken = signUpData.idToken;
      }

      // 2. Firestore: Save/overwrite user document
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
              disabled:        { booleanValue: false },
            },
          }),
        }
      );

      results.push({ email: acc.email, status: isNew ? 'Başarıyla oluşturuldu' : 'Firestore güncellendi' });
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
