import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    if (!uid && !email) {
      return NextResponse.json({ success: false, error: 'UID veya E-posta belirtilmelidir.' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    // 1. Try fetching from Cloud Firestore
    if (projectId && apiKey && uid) {
      try {
        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?key=${apiKey}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data && data.fields) {
          const fields = data.fields;
          const role = fields.role?.stringValue || 'teacher';
          const name = fields.name?.stringValue || '';
          const instId = fields.institutionId?.stringValue || 'yamanevler';
          const instName = fields.institutionName?.stringValue || (instId === 'yamanevler' ? 'Yamanevler Enderun Bilişim' : instId.toUpperCase());
          return NextResponse.json({
            success: true,
            profile: { uid, name, email: fields.email?.stringValue || email, role, institutionId: instId, institutionName: instName }
          });
        }
      } catch (err) {
        console.warn("Firestore user profile fetch failed, using local DB:", err.message);
      }
    }

    // 2. Fallback to local DB
    const dbData = readDb();
    const localUsers = dbData.users || [];
    let found = localUsers.find(u => u.id === uid || u.email === email);

    if (!found && email) {
      // Auto-register known seed admin accounts
      if (email === 'admin@yeb.local' || email === 'yeb@2026.com') {
        found = {
          id: uid || 'yeb-admin',
          name: 'Sistem Yöneticisi',
          email: email,
          role: 'admin',
          institutionId: 'yamanevler',
          institutionName: 'Yamanevler Enderun Bilişim'
        };
      }
    }

    if (found) {
      return NextResponse.json({
        success: true,
        profile: {
          uid: found.id || uid,
          name: found.name || '',
          email: found.email || '',
          role: found.role || 'teacher',
          institutionId: found.institutionId || 'yamanevler',
          institutionName: found.institutionName || (found.institutionId === 'yamanevler' ? 'Yamanevler Enderun Bilişim' : found.institutionId.toUpperCase())
        }
      });
    }

    // Default fallback if user not found at all
    return NextResponse.json({
      success: true,
      profile: {
        uid: uid || 'guest',
        name: 'Misafir Öğretmen',
        email: email || '',
        role: 'teacher',
        institutionId: 'yamanevler',
        institutionName: 'Yamanevler Enderun Bilişim'
      }
    });

  } catch (error) {
    console.error("Profile API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
