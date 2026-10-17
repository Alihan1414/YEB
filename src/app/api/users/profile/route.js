import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function areEmailsEquivalent(e1, e2) {
  if (!e1 || !e2) return false;
  const a = e1.toLowerCase().trim();
  const b = e2.toLowerCase().trim();
  if (a === b) return true;
  const aNoCom = a.endsWith('.com') ? a.slice(0, -4) : a;
  const bNoCom = b.endsWith('.com') ? b.slice(0, -4) : b;
  return aNoCom === bNoCom;
}

// Firebase config fallback (public client-side keys, not secrets)
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyDAkvmh3UMgWeKs-Cqjd4_hS6pzb2pXkqU';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-reports-app-22e38';

// Helper: get institution branding from local DB
function getInstBranding(instId) {
  try {
    const dbData = readDb();
    const inst = (dbData.institutions || []).find(i => i.id === instId);
    if (inst) {
      return {
        logoUrl: inst.logoUrl || '',
        primaryColor: inst.primaryColor || '#06429c',
        enabledModules: inst.enabledModules || { ai: true, leave: true, tv: true, weekly: true },
        institutionName: inst.name || instId,
      };
    }
  } catch {}
  return {
    logoUrl: '',
    primaryColor: '#06429c',
    enabledModules: { ai: true, leave: true, tv: true, weekly: true },
    institutionName: null,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    if (!uid && !email) {
      return NextResponse.json({ success: false, error: 'UID veya E-posta belirtilmelidir.' }, { status: 400 });
    }

    const projectId = FIREBASE_PROJECT_ID;
    const apiKey    = FIREBASE_API_KEY;

    // 1. Try fetching from Cloud Firestore
    if (uid) {
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
          const isDisabled = fields.disabled?.booleanValue === true;

          // Disabled institution check — block login
          if (isDisabled) {
            return NextResponse.json(
              { success: false, error: 'Bu hesap devre dışı bırakılmıştır. Lütfen platform yöneticisiyle iletişime geçin.' },
              { status: 403 }
            );
          }

          let instId = fields.institutionId?.stringValue;
          if (!instId) {
            instId = (email === 'admin@yeb.local' || role === 'super_admin') ? 'platform' : 'unknown';
          }

          let instName = fields.institutionName?.stringValue;
          
          // Get branding from local DB (authoritative source for branding)
          const branding = getInstBranding(instId);
          
          if (!instName) {
            instName = branding.institutionName || (instId === 'platform' ? 'Sistem Yönetimi' : instId);
          }

          return NextResponse.json({
            success: true,
            profile: {
              uid,
              name,
              email: fields.email?.stringValue || email,
              role,
              institutionId: instId,
              institutionName: instName,
              logoUrl: fields.logoUrl?.stringValue || branding.logoUrl,
              primaryColor: fields.primaryColor?.stringValue || branding.primaryColor,
              enabledModules: branding.enabledModules,
            }
          });
        }
      } catch (err) {
        console.warn("Firestore user profile fetch failed, using local DB:", err.message);
      }
    }

    // 2. Fallback to local DB
    const dbData = readDb();
    const localUsers = dbData.users || [];
    let found = localUsers.find(u => {
      if (uid && u.id === uid) return true;
      if (!u.email) return false;
      return areEmailsEquivalent(u.email, email);
    });

    // If found by email but the stored ID doesn't match Firebase UID,
    // update the ID so future UID-based lookups work instantly
    if (found && uid && found.id !== uid) {
      try {
        const idx = dbData.users.findIndex(u => u.id === found.id);
        if (idx >= 0) {
          dbData.users[idx].id = uid;
          writeDb(dbData);
          found = dbData.users[idx];
        }
      } catch (e) {
        console.warn('Failed to update user UID in local DB:', e.message);
      }
    }

    if (!found && email) {
      // Auto-register known seed admin accounts
      if (email === 'admin@yeb.local') {
        found = {
          id: uid || 'super-admin',
          name: 'Sistem Yöneticisi',
          email: email,
          role: 'super_admin',
          institutionId: 'platform',
          institutionName: 'Sistem Yönetimi',
          logoUrl: '',
          primaryColor: '#06429c',
        };
      }
    }

    if (found) {
      if (found.disabled === true) {
        return NextResponse.json(
          { success: false, error: 'Bu hesap devre dışı bırakılmıştır.' },
          { status: 403 }
        );
      }

      const instId = found.institutionId || (found.role === 'super_admin' ? 'platform' : 'unknown');
      const branding = getInstBranding(instId);

      const instName = found.institutionName || branding.institutionName ||
        (instId === 'platform' ? 'Sistem Yönetimi' : instId);

      return NextResponse.json({
        success: true,
        profile: {
          uid: found.id || uid,
          name: found.name || '',
          email: found.email || '',
          role: found.role || 'teacher',
          institutionId: instId,
          institutionName: instName,
          logoUrl: found.logoUrl || branding.logoUrl,
          primaryColor: found.primaryColor || branding.primaryColor,
          enabledModules: branding.enabledModules,
        }
      });
    }

    // 3. Not found → return error (no default institution fallback)
    return NextResponse.json(
      { success: false, error: 'Kullanıcı profili bulunamadı.' },
      { status: 404 }
    );

  } catch (error) {
    console.error("Profile API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
