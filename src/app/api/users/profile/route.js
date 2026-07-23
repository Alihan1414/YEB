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
          
          let instId = fields.institutionId?.stringValue;
          if (!instId) {
            instId = (email === 'admin@yeb.local' || role === 'super_admin') ? 'platform' : 'yamanevler';
          }

          let instName = fields.institutionName?.stringValue;
          if (!instName) {
            if (instId === 'platform') instName = 'Sistem Yönetimi';
            else if (instId === 'yamanevler') instName = 'Yamanevler Enderun Bilişim';
            else instName = instId.toUpperCase();
          }

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
      if (email === 'admin@yeb.local') {
        found = {
          id: uid || 'super-admin',
          name: 'Sistem Yöneticisi',
          email: email,
          role: 'super_admin',
          institutionId: 'platform',
          institutionName: 'Sistem Yönetimi'
        };
      } else if (email === 'yeb@2026.com') {
        found = {
          id: uid || 'yeb-admin',
          name: 'Yamanevler Admin',
          email: email,
          role: 'admin',
          institutionId: 'yamanevler',
          institutionName: 'Yamanevler Enderun Bilişim'
        };
      }
    }

    if (found) {
      let instId = found.institutionId;
      if (!instId) {
        instId = (found.role === 'super_admin' || found.email === 'admin@yeb.local') ? 'platform' : 'yamanevler';
      }

      let instName = found.institutionName;
      if (!instName) {
        if (instId === 'platform') instName = 'Sistem Yönetimi';
        else if (instId === 'yamanevler') instName = 'Yamanevler Enderun Bilişim';
        else instName = instId.toUpperCase();
      }

      return NextResponse.json({
        success: true,
        profile: {
          uid: found.id || uid,
          name: found.name || '',
          email: found.email || '',
          role: found.role || 'teacher',
          institutionId: instId,
          institutionName: instName
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
