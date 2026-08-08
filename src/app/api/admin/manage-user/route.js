import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';

export async function POST(req) {
  try {
    const { action, userId, email, password, name, role, institutionId, institutionName, disabled } = await req.json();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Aksiyon belirtilmelidir.' }, { status: 400 });
    }

    const dbData = readDb();
    if (!dbData.users) dbData.users = [];

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
          
          await fetch(
            `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${FIREBASE_API_KEY}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  name:            { stringValue: name.trim() },
                  email:           { stringValue: trimmedEmail },
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

      const newUser = {
        id: uid,
        name: name.trim(),
        email: trimmedEmail,
        password: password,
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

      try {
        const updateFields = {};
        if (name) updateFields.name = { stringValue: name.trim() };
        if (email) updateFields.email = { stringValue: trimmedEmail };
        if (role) updateFields.role = { stringValue: role };
        if (institutionId) updateFields.institutionId = { stringValue: institutionId };
        if (institutionName) updateFields.institutionName = { stringValue: institutionName.trim() };
        if (typeof disabled === 'boolean') updateFields.disabled = { booleanValue: disabled };

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

    // --- DELETE / DISABLE ACTION ---
    if (action === 'delete') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Kullanıcı ID gereklidir.' }, { status: 400 });
      }

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

      const userIdx = dbData.users.findIndex(u => u.id === userId || u.email === userId);
      if (userIdx !== -1) {
        dbData.users[userIdx].disabled = true;
      }
      writeDb(dbData);

      return NextResponse.json({ success: true, message: 'Kullanıcı devre dışı bırakıldı.' });
    }

    // --- ENABLE / UNBLOCK ACTION ---
    if (action === 'enable') {
      if (!userId) {
        return NextResponse.json({ success: false, error: 'Kullanıcı ID gereklidir.' }, { status: 400 });
      }

      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=disabled&key=${FIREBASE_API_KEY}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { disabled: { booleanValue: false } } }),
          }
        );
      } catch (err) {
        console.warn("Firestore enable failed in manage-user:", err.message);
      }

      const userIdx = dbData.users.findIndex(u => u.id === userId || u.email === userId);
      if (userIdx !== -1) {
        dbData.users[userIdx].disabled = false;
      }
      writeDb(dbData);

      return NextResponse.json({ success: true, message: 'Kullanıcının engeli kaldırıldı ve aktifleştirildi.' });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen aksiyon.' }, { status: 400 });

  } catch (error) {
    console.error("Manage user API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
