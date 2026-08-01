import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

// Firebase config fallback (these are public client-side keys, not secrets)
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function POST(req) {
  try {
    const { name, email, password, logoUrl, primaryColor, enabledModules } = await req.json();

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

    const rawEmail = email.trim();
    const normalizeEmail = (addr) => {
      const parts = addr.split('@');
      if (parts.length === 2 && !parts[1].includes('.')) {
        return `${parts[0]}@${parts[1]}.com`;
      }
      return addr;
    };
    const firebaseEmail = normalizeEmail(rawEmail);

    let uid = `admin-${instId}-${Date.now()}`;

    // 1. Try Firebase Auth
    try {
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: firebaseEmail, password: password, returnSecureToken: true }),
        }
      );
      const signUpData = await signUpRes.json();
      if (!signUpData.error && signUpData.localId) {
        uid = signUpData.localId;
      }

      // Save user profile in Firestore
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              name:            { stringValue: name.trim() + ' Yöneticisi' },
              email:           { stringValue: rawEmail },
              role:            { stringValue: 'admin' },
              institutionId:   { stringValue: instId },
              institutionName: { stringValue: name.trim() },
              logoUrl:         { stringValue: logoUrl || '' },
              primaryColor:    { stringValue: primaryColor || '#06429c' },
              disabled:        { booleanValue: false },
            },
          }),
        }
      );

      // Save institution record in Firestore
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/institutions/${instId}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              id:              { stringValue: instId },
              name:            { stringValue: name.trim() },
              email:           { stringValue: rawEmail },
              logoUrl:         { stringValue: logoUrl || '' },
              primaryColor:    { stringValue: primaryColor || '#06429c' },
              disabled:        { booleanValue: false },
            },
          }),
        }
      );
    } catch (fbErr) {
      console.warn("Firebase signup/institution create failed, relying on local DB:", fbErr.message);
    }

    // 2. Save in Local DB (users & institutions)
    const dbData = readDb();
    if (!dbData.institutions) dbData.institutions = [];
    if (!dbData.users) dbData.users = [];

    // Add or update institution record
    const existingInstIdx = dbData.institutions.findIndex(i => i.id === instId);
    const instRecord = {
      id: instId,
      name: name.trim(),
      email: rawEmail,
      logoUrl: logoUrl || '',
      primaryColor: primaryColor || '#06429c',
      enabledModules: enabledModules || { ai: true, leave: true, tv: true, weekly: true },
      disabled: false,
      created_at: new Date().toISOString()
    };

    if (existingInstIdx >= 0) {
      dbData.institutions[existingInstIdx] = instRecord;
    } else {
      dbData.institutions.push(instRecord);
    }

    // Add user record for institution admin
    const existingUserIdx = dbData.users.findIndex(u => u.email === rawEmail);
    const userRecord = {
      id: uid,
      name: name.trim() + ' Yöneticisi',
      email: rawEmail,
      password: password,
      role: 'admin',
      institutionId: instId,
      institutionName: name.trim(),
      logoUrl: logoUrl || '',
      primaryColor: primaryColor || '#06429c',
      disabled: false,
      created_at: new Date().toISOString()
    };

    if (existingUserIdx >= 0) {
      dbData.users[existingUserIdx] = userRecord;
    } else {
      dbData.users.push(userRecord);
    }

    writeDb(dbData);

    return NextResponse.json({
      success: true,
      institutionId: instId,
      institution: instRecord,
      user: userRecord,
      message: 'Kurum ve yönetici başarıyla oluşturuldu.'
    });

  } catch (error) {
    console.error("Create institution API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
