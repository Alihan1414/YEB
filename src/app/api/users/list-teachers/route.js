import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

// Resolve institution ID from email or directly from input
async function getInstitutionId(emailOrInst) {
  const input = emailOrInst.trim().toLowerCase();
  
  if (input === 'admin' || input === 'admin@yeb.local') {
    return 'platform';
  }
  if (input === 'yeb@2026' || input === 'yeb@2026.com') {
    return 'yamanevler';
  }

  let institutionId = input;
  let isEmail = input.includes('@');

  if (isEmail) {
    // 1. Try to find the user profile in Firestore to get institutionId
    try {
      // First find if there's any user in local DB with this email
      const dbData = readDb();
      const localUser = (dbData.users || []).find(u => u.email.toLowerCase() === input);
      if (localUser && localUser.institutionId) {
        return localUser.institutionId;
      }

      // If not, fetch all users from Firestore and match
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        const users = data.documents || [];
        for (const doc of users) {
          const fields = doc.fields || {};
          const email = fields.email?.stringValue || '';
          if (email.toLowerCase() === input) {
            return fields.institutionId?.stringValue || 'yamanevler';
          }
        }
      }
    } catch (e) {
      console.warn("Firestore error in getInstitutionId, falling back:", e.message);
    }
    
    // If it's an email format like name.surname@yamanevler.com, extract "yamanevler"
    const domain = input.split('@')[1];
    if (domain) {
      const parts = domain.split('.');
      if (parts[0]) return parts[0];
    }
  }

  return institutionId;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const emailOrInst = searchParams.get('emailOrInst');

    if (!emailOrInst) {
      return NextResponse.json({ success: false, teachers: [] });
    }

    const instId = await getInstitutionId(emailOrInst);
    let teachers = [];

    // 1. Try fetching from Firestore
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
          const uInstId = (f.institutionId?.stringValue || '').toLowerCase();
          const email = (f.email?.stringValue || '').toLowerCase();
          const name = f.name?.stringValue || '';
          
          if (uInstId === instId) {
            if (!teachers.some(t => t.email.toLowerCase() === email)) {
              teachers.push({
                name: name,
                email: email,
                role: role,
              });
            }
          }
        });
      }
    } catch (err) {
      console.warn("Firestore error in list-teachers:", err.message);
    }

    // 2. Fetch from local DB
    try {
      const dbData = readDb();
      const localUsers = dbData.users || [];
      localUsers.forEach(lu => {
        const luInstId = (lu.institutionId || '').toLowerCase();
        if (luInstId === instId) {
          if (!teachers.some(t => t.email.toLowerCase() === (lu.email || '').toLowerCase())) {
            teachers.push({
              name: lu.name || '',
              email: lu.email || '',
              role: lu.role || 'teacher',
            });
          }
        }
      });
    } catch (err) {
      console.warn("Local DB error in list-teachers:", err.message);
    }

    // 3. Ensure institution admin is present for 'yamanevler'
    if (instId === 'yamanevler') {
      if (!teachers.some(t => t.email === 'yeb@2026.com')) {
        teachers.unshift({
          name: 'Yamanevler Enderun Bilişim Yöneticisi',
          email: 'yeb@2026.com',
          role: 'admin'
        });
      }
    }

    // Sort: Admins first, then teachers alphabetically
    teachers.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      return (a.name || '').localeCompare(b.name || '', 'tr');
    });

    return NextResponse.json({
      success: true,
      institutionId: instId,
      teachers: teachers
    });

  } catch (error) {
    console.error("List teachers API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
