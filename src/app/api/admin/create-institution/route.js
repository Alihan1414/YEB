import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Tüm alanlar zorunludur.' }, { status: 400 });
    }

    // 1. Türkçe karakterleri latinize ederek slug oluştur
    const instId = name
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40);

    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // LOCAL DB FALLBACK IF FIREBASE NOT CONFIGURED
    if (!apiKey || !projectId) {
      const dbData = readDb();
      const localUsers = dbData.users || [];

      if (localUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        return NextResponse.json({ success: false, error: 'Bu e-posta zaten kayıtlı.' }, { status: 400 });
      }

      const newUser = {
        id: 'user-' + Date.now(),
        name: name.trim() + ' Yöneticisi',
        email: email.trim(),
        role: 'admin',
        institutionId: instId,
        institutionName: name.trim(),
        disabled: false
      };
      localUsers.push(newUser);
      dbData.users = localUsers;
      writeDb(dbData);

      return NextResponse.json({
        success: true,
        institutionId: instId,
        message: 'Kurum ve yönetici başarıyla yerel veritabanında oluşturuldu (Local DB Mode).'
      });
    }

    // 2. Firebase Auth: User creation
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
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

    // 3. Firestore: Save user profile
    const firestoreRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?key=${apiKey}`,
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
      
      // Secondary fallback to local DB if Firestore write fails but user was created in Auth
      const dbData = readDb();
      const localUsers = dbData.users || [];
      localUsers.push({
        id: uid,
        name: name.trim() + ' Yöneticisi',
        email: email.trim(),
        role: 'admin',
        institutionId: instId,
        institutionName: name.trim(),
        disabled: false
      });
      dbData.users = localUsers;
      writeDb(dbData);
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
