import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function POST(req) {
  try {
    const { action, userId, email, password, name, role, institutionId, institutionName, disabled } = await req.json();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Aksiyon belirtilmelidir.' }, { status: 400 });
    }

    const dbData = readDb();
    if (!dbData.users) dbData.users = [];

    // Normalize: Firebase Auth requires a valid TLD (e.g. user@2026 → user@2026.com)
    const normalizeEmail = (addr) => {
      const parts = addr.split('@');
      if (parts.length === 2 && !parts[1].includes('.')) return `${parts[0]}@${parts[1]}.com`;
      return addr;
    };

    // --- CREATE ACTION ---
    if (action === 'create') {
      if (!email || !password || !name || !role || !institutionId || !institutionName) {
        return NextResponse.json({ success: false, error: 'Tüm alanlar zorunludur.' }, { status: 400 });
      }

      const trimmedEmail = email.trim().toLowerCase();
      const firebaseEmail = normalizeEmail(trimmedEmail);
      let uid = `local-user-${Date.now()}`;

      // 1. Try Firebase Auth
      try {
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: firebaseEmail, password, returnSecureToken: true }),
          }
        );
        const signUpData = await signUpRes.json();
        if (signUpData && !signUpData.error) {
          uid = signUpData.localId;
          
          // Save to Firestore
          await fetch(
            `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  name:            { stringValue: name.trim() },
                  email:           { stringValue: trimmedEmail }, // store original
                  role:            { stringValue: role },
                  institutionId:   { stringValue: institutionId },
                  institutionName: { stringValue: institutionName.trim() },
                  disabled:        { booleanValue: false },
                },
              }),
            }
          );
        } else if (signUpData && signUpData.error) {
          const errMsg = signUpData.error.message === 'EMAIL_EXISTS' ? 'Bu e-posta zaten kayıtlı.' : signUpData.error.message;
          return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
        }
      } catch (err) {
        console.warn("Firestore sign up failed in manage-user:", err.message);
      }

      // 2. Save to Local DB fallback
      const newUser = {
        id: uid,
        name: name.trim(),
        email: trimmedEmail,
        password: password, // Store password plain text for local fallback auth
        role,
        institutionId,
        institutionName: institutionName.trim(),
        disabled: false
      };

      dbData.users.push(newUser);
      writeDb(dbData);

      return NextResponse.json({ success: true, message: 'Kullanıcı başarıyla oluşturuldu.', user: newUser });
    }

    // --- UPDATE ACTION ---
    if (action === 'update') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Kullanıcı ID gereklidir.' }, { status: 400 });
      }

      const trimmedEmail = email ? email.trim().toLowerCase() : '';

      // 1. Try Firebase Auth / Firestore Update
      try {
        const updateFields = {};
        if (name) updateFields.name = { stringValue: name.trim() };
        if (email) updateFields.email = { stringValue: trimmedEmail };
        if (role) updateFields.role = { stringValue: role };
        if (institutionId) updateFields.institutionId = { stringValue: institutionId };
        if (institutionName) updateFields.institutionName = { stringValue: institutionName.trim() };
        if (typeof disabled === 'boolean') updateFields.disabled = { booleanValue: disabled };

        // Construct updateMask query params
        const fieldPaths = Object.keys(updateFields).map(f => `updateMask.fieldPaths=${f}`).join('&');

        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}?${fieldPaths}&key=${FIREBASE_API_KEY}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: updateFields }),
          }
        );
      } catch (err) {
        console.warn("Firestore update failed in manage-user:", err.message);
      }

      // 2. Update Local DB
      const userIdx = dbData.users.findIndex(u => u.id === userId || u.email === userId);
      if (userIdx !== -1) {
        if (name) dbData.users[userIdx].name = name.trim();
        if (email) dbData.users[userIdx].email = trimmedEmail;
        if (role) dbData.users[userIdx].role = role;
        if (institutionId) dbData.users[userIdx].institutionId = institutionId;
        if (institutionName) dbData.users[userIdx].institutionName = institutionName.trim();
        if (typeof disabled === 'boolean') dbData.users[userIdx].disabled = disabled;
        if (password) dbData.users[userIdx].password = password;
      } else if (email) {
        // If not found by ID, try finding by email
        const userIdxByEmail = dbData.users.findIndex(u => u.email === trimmedEmail);
        if (userIdxByEmail !== -1) {
          if (name) dbData.users[userIdxByEmail].name = name.trim();
          if (role) dbData.users[userIdxByEmail].role = role;
          if (institutionId) dbData.users[userIdxByEmail].institutionId = institutionId;
          if (institutionName) dbData.users[userIdxByEmail].institutionName = institutionName.trim();
          if (typeof disabled === 'boolean') dbData.users[userIdxByEmail].disabled = disabled;
          if (password) dbData.users[userIdxByEmail].password = password;
        }
      }

      writeDb(dbData);

      return NextResponse.json({ success: true, message: 'Kullanıcı güncellendi.' });
    }

    // --- DELETE ACTION ---
    if (action === 'delete') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Kullanıcı ID gereklidir.' }, { status: 400 });
      }

      // 1. Try Firestore Delete/Disable
      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=disabled&key=${FIREBASE_API_KEY}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { disabled: { booleanValue: true } } }),
          }
        );
      } catch (err) {
        console.warn("Firestore delete/disable failed in manage-user:", err.message);
      }

      // 2. Update Local DB (disable user)
      const userIdx = dbData.users.findIndex(u => u.id === userId || u.email === userId);
      if (userIdx !== -1) {
        dbData.users[userIdx].disabled = true;
      }
      writeDb(dbData);

      return NextResponse.json({ success: true, message: 'Kullanıcı devre dışı bırakıldı (silindi).' });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen aksiyon.' }, { status: 400 });

  } catch (error) {
    console.error("Manage user API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
