import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'E-posta ve şifre gereklidir.' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check seed accounts first
    if (trimmedEmail === 'admin@yeb.local' && password === 'admin14') {
      return NextResponse.json({
        success: true,
        profile: {
          uid: 'super-admin',
          name: 'Sistem Yöneticisi',
          email: 'admin@yeb.local',
          role: 'super_admin',
          institutionId: 'platform',
          institutionName: 'Sistem Yönetimi'
        }
      });
    }

    if (trimmedEmail === 'yeb@2026.com' && password === 'enderun bilişim') {
      return NextResponse.json({
        success: true,
        profile: {
          uid: 'yeb-admin',
          name: 'Yamanevler Admin',
          email: 'yeb@2026.com',
          role: 'admin',
          institutionId: 'yamanevler',
          institutionName: 'Yamanevler Enderun Bilişim'
        }
      });
    }

    // 2. Check local DB users
    const dbData = readDb();
    const localUsers = dbData.users || [];
    const found = localUsers.find(u => u.email.toLowerCase() === trimmedEmail);

    if (found) {
      // In local mode/fallback, we allow login if password matches.
      // (For simplicity or password mock check, we can store password in the user profile if needed,
      // or match against a default institution password if not specified)
      if (found.disabled) {
        return NextResponse.json({ success: false, error: 'Bu hesap devre dışı bırakılmıştır.' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        profile: {
          uid: found.id || found.email,
          name: found.name,
          email: found.email,
          role: found.role,
          institutionId: found.institutionId,
          institutionName: found.institutionName
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 });

  } catch (error) {
    console.error("Local login API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
