import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

// Firebase config fallback (these are public client-side keys, not secrets)
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Tüm alanlar zorunludur.' }, { status: 400 });
    }

    // Türkçe karakterleri latinize ederek slug oluştur
    const instId = name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40);

    // Firebase Auth: User creation
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password, returnSecureToken: true }),
      }
    );
    const signUpData = await signUpRes.json();
    if (signUpData.error) {
      const errMsg = signUpData.error.message === 'EMAIL_EXISTS'
        ? 'Bu e-posta zaten kayıtlı.'
        : signUpData.error.message;
      return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
    }

    const { localId: uid, idToken } = signUpData;

    // Firestore: Save user profile
    const firestoreRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          fields: {
            name:            { stringValue: name.trim() + ' Yöneticisi' },
            email:           { stringValue: email.trim() },
            role:            { stringValue: 'admin' },
            institutionId:   { stringValue: instId },
            institutionName: { stringValue: name.trim() },
            disabled:        { booleanValue: false },
          },
        }),
      }
    );

    if (!firestoreRes.ok) {
      const errText = await firestoreRes.text();
      console.error("Firestore save error:", errText);
      return NextResponse.json({ success: false, error: 'Kullanıcı oluşturuldu ama profil kaydedilemedi.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      institutionId: instId,
      message: 'Kurum ve yönetici başarıyla oluşturuldu.'
    });

  } catch (error) {
    console.error("Create institution API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
