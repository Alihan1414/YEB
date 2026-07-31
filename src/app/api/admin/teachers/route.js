import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

// Helper to latinize Turkish characters and create a clean email prefix
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

    let teachers = [];

    // 1. Fetch from local DB
    try {
      const dbData = readDb();
      const localUsers = dbData.users || [];
      localUsers.forEach(lu => {
        if (lu.institutionId === institutionId && lu.role === 'teacher') {
          teachers.push({
            id: lu.id || lu.email,
            name: lu.name,
            email: lu.email,
            role: 'teacher',
            institutionId: lu.institutionId,
            institutionName: lu.institutionName,
            disabled: lu.disabled || false
          });
        }
      });
    } catch (err) {
      console.warn("Local DB fetch failed in teachers API:", err.message);
    }

    // 2. Fetch from Firestore
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        docs.forEach(doc => {
          const f = doc.fields || {};
          const role = f.role?.stringValue || 'teacher';
          const uInstId = f.institutionId?.stringValue || '';
          const email = f.email?.stringValue || '';
          
          if (uInstId === institutionId && role === 'teacher') {
            if (!teachers.some(t => t.email.toLowerCase() === email.toLowerCase())) {
              teachers.push({
                id: doc.name.split('/').pop(),
                name: f.name?.stringValue || '',
                email: email,
                role: 'teacher',
                institutionId: uInstId,
                institutionName: f.institutionName?.stringValue || '',
                disabled: f.disabled?.booleanValue || false
              });
            }
          }
        });
      }
    } catch (err) {
      console.warn("Firestore fetch failed in teachers API:", err.message);
    }

    return NextResponse.json({ success: true, teachers });
  } catch (error) {
    console.error("GET Teachers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, surname, email: customEmail, password, institutionId, institutionName } = await req.json();

    if (!name || !password || !institutionId) {
      return NextResponse.json({ success: false, error: 'Öğretmen adı, şifre ve kurum ID gereklidir.' }, { status: 400 });
    }

    const instId = institutionId.trim().toLowerCase();
    const cleanName = surname ? `${name.trim()} ${surname.trim()}` : name.trim();
    
    let email = (customEmail || '').trim().toLowerCase();
    if (!email) {
      const slugName = slugifyName(name);
      const slugSurname = surname ? slugifyName(surname) : '';
      email = `${slugName}${slugSurname ? '.' + slugSurname : ''}@${instId}.com`;
    }

    // 1. Check teacher limit (max 30 teachers per institution)
    const dbData = readDb();
    const localUsers = dbData.users || [];
    const currentTeachers = localUsers.filter(u => (u.institutionId || '').toLowerCase() === instId && u.role === 'teacher');
    
    if (currentTeachers.length >= 30) {
      return NextResponse.json({ success: false, error: 'Maksimum öğretmen limitine ulaşıldı.' }, { status: 400 });
    }

    // Check email uniqueness
    if (localUsers.some(u => u.email.toLowerCase() === email)) {
      return NextResponse.json({ success: false, error: 'Bu e-posta adresi ile zaten kayıtlı bir kullanıcı var.' }, { status: 400 });
    }

    // 2. Try to register user in Firebase Auth
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
        
        // Save profile in Firestore
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${firebaseUid}?key=${FIREBASE_API_KEY}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                name:            { stringValue: cleanName },
                email:           { stringValue: email },
                role:            { stringValue: 'teacher' },
                institutionId:   { stringValue: instId },
                institutionName: { stringValue: institutionName || 'Enderun Bilişim' },
                disabled:        { booleanValue: false },
              },
            }),
          }
        );
      }
    } catch (fbErr) {
      console.warn("Firebase Auth teacher creation failed, falling back to local only:", fbErr.message);
    }

    // 3. Save to local DB (always, as source of truth and fallback)
    const newTeacher = {
      id: firebaseUid || `teacher-${Date.now()}`,
      name: cleanName,
      email: email,
      password: password, // For local DB auth fallback
      role: 'teacher',
      institutionId: instId,
      institutionName: institutionName || 'Enderun Bilişim',
      disabled: false,
      created_at: new Date().toISOString()
    };

    localUsers.push(newTeacher);
    dbData.users = localUsers;
    writeDb(dbData);

    return NextResponse.json({
      success: true,
      teacher: {
        id: newTeacher.id,
        name: newTeacher.name,
        email: newTeacher.email,
        role: 'teacher'
      }
    });

  } catch (error) {
    console.error("POST Teachers error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get('id');

    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Öğretmen ID gereklidir.' }, { status: 400 });
    }

    // Remove from local DB
    const dbData = readDb();
    const initialCount = dbData.users?.length || 0;
    dbData.users = (dbData.users || []).filter(u => u.id !== teacherId && u.email !== teacherId);
    
    if (dbData.users.length === initialCount) {
      return NextResponse.json({ success: false, error: 'Öğretmen bulunamadı.' }, { status: 404 });
    }

    writeDb(dbData);

    // Try deleting from Firestore if matches ID
    try {
      if (!teacherId.includes('@')) {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${teacherId}?key=${FIREBASE_API_KEY}`,
          { method: 'DELETE' }
        );
      }
    } catch (e) {
      console.warn("Firestore delete failed:", e.message);
    }

    return NextResponse.json({ success: true, message: 'Öğretmen başarıyla silindi.' });
  } catch (error) {
    console.error("DELETE Teacher error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
