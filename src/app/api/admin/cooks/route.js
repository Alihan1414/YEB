import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId') || 'yamanevler';

    let cooks = [];

    // 1. Fetch from local DB
    try {
      const dbData = readDb();
      const localUsers = dbData.users || [];
      localUsers.forEach(lu => {
        if (lu.institutionId === institutionId && lu.role === 'cook') {
          cooks.push({
            id: lu.id || lu.email,
            name: lu.name,
            email: lu.email,
            role: 'cook',
            institutionId: lu.institutionId,
            institutionName: lu.institutionName,
            disabled: lu.disabled || false
          });
        }
      });
    } catch (err) {
      console.warn("Local DB fetch failed in cooks API:", err.message);
    }

    // 2. Fetch from Firestore
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}&pageSize=300`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        docs.forEach(doc => {
          const f = doc.fields || {};
          const role = f.role?.stringValue || '';
          const uInstId = f.institutionId?.stringValue || '';
          const email = f.email?.stringValue || '';
          
          if (uInstId === institutionId && role === 'cook') {
            if (!cooks.some(c => c.email.toLowerCase() === email.toLowerCase())) {
              cooks.push({
                id: doc.name.split('/').pop(),
                name: f.name?.stringValue || '',
                email: email,
                role: 'cook',
                institutionId: uInstId,
                institutionName: f.institutionName?.stringValue || '',
                disabled: f.disabled?.booleanValue || false
              });
            }
          }
        });
      }
    } catch (err) {
      console.warn("Firestore fetch failed in cooks API:", err.message);
    }

    return NextResponse.json({ success: true, cooks });
  } catch (error) {
    console.error("GET Cooks error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, surname, email: customEmail, password, institutionId, institutionName } = await req.json();

    if (!name || !password || !institutionId) {
      return NextResponse.json({ success: false, error: 'Aşçı adı, şifre ve kurum ID gereklidir.' }, { status: 400 });
    }

    const instId = institutionId.trim().toLowerCase();
    const cleanName = surname ? `${name.trim()} ${surname.trim()}` : name.trim();
    
    let email = (customEmail || '').trim().toLowerCase();
    
    const normalizeEmail = (addr) => {
      if (!addr) return '';
      const parts = addr.split('@');
      if (parts.length === 2 && !parts[1].includes('.')) return `${parts[0]}@${parts[1]}.com`;
      return addr;
    };

    if (!email) {
      const slugName = slugifyName(name);
      const slugSurname = surname ? slugifyName(surname) : '';
      email = `asci.${slugName}${slugSurname ? '.' + slugSurname : ''}@${instId}.com`;
    } else {
      email = normalizeEmail(email);
    }

    const dbData = readDb();
    const localUsers = dbData.users || [];

    // Register in Firebase Auth
    let firebaseUid = null;
    try {
      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password, returnSecureToken: true }),
        }
      );
      const signUpData = await signUpRes.json();
      if (signUpData && !signUpData.error) {
        firebaseUid = signUpData.localId;
      } else if (signUpData?.error?.message === 'EMAIL_EXISTS') {
        firebaseUid = `asci-${Date.now()}`;
      }
    } catch (fbErr) {
      console.warn("Firebase Auth cook creation failed:", fbErr.message);
    }

    if (!firebaseUid) {
      firebaseUid = `asci-${Date.now()}`;
    }

    // Save profile to Firestore
    try {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${firebaseUid}?key=${FIREBASE_API_KEY}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              name:            { stringValue: cleanName },
              email:           { stringValue: email },
              password:        { stringValue: password },
              role:            { stringValue: 'cook' },
              institutionId:   { stringValue: instId },
              institutionName: { stringValue: institutionName || 'Enderun Bilişim' },
              disabled:        { booleanValue: false },
            },
          }),
        }
      );
    } catch (fsErr) {
      console.warn("Firestore save failed for cook:", fsErr.message);
    }

    // Save to local DB
    const newCook = {
      id: firebaseUid,
      name: cleanName,
      email: email,
      password: password,
      role: 'cook',
      institutionId: instId,
      institutionName: institutionName || 'Enderun Bilişim',
      disabled: false,
      created_at: new Date().toISOString()
    };

    // Remove any existing user with same id/email before pushing
    dbData.users = localUsers.filter(u => u.email !== email && u.id !== firebaseUid);
    dbData.users.push(newCook);
    writeDb(dbData);

    return NextResponse.json({
      success: true,
      cook: {
        id: newCook.id,
        name: newCook.name,
        email: newCook.email,
        role: 'cook'
      }
    });

  } catch (error) {
    console.error("POST Cook error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cookId = searchParams.get('id');

    if (!cookId) {
      return NextResponse.json({ success: false, error: 'Aşçı ID gereklidir.' }, { status: 400 });
    }

    // Remove from local DB
    const dbData = readDb();
    const initialCount = dbData.users?.length || 0;
    dbData.users = (dbData.users || []).filter(u => u.id !== cookId && u.email !== cookId);
    writeDb(dbData);

    // Try deleting from Firestore
    try {
      if (!cookId.includes('@')) {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${cookId}?key=${FIREBASE_API_KEY}`,
          { method: 'DELETE' }
        );
      }
    } catch (e) {
      console.warn("Firestore delete cook failed:", e.message);
    }

    return NextResponse.json({ success: true, message: 'Aşçı hesabı başarıyla silindi.' });
  } catch (error) {
    console.error("DELETE Cook error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
