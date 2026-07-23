import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

// Firebase config fallback (these are public client-side keys, not secrets)
const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function GET(req) {
  try {
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    let usersList = [];

    // 1. Try to read from Firestore
    try {
        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          usersList = (data.documents || []).map(doc => {
            const f = doc.fields || {};
            return {
              id:              doc.name.split('/').pop(),
              name:            f.name?.stringValue            || '',
              email:           f.email?.stringValue           || '',
              role:            f.role?.stringValue            || 'teacher',
              institutionId:   f.institutionId?.stringValue   || 'yamanevler',
              institutionName: f.institutionName?.stringValue || 'Yamanevler Enderun Bilişim',
              disabled:        f.disabled?.booleanValue       || false,
            };
          });
        }
      } catch (err) {
        console.warn("Firestore list users failed, falling back to local DB:", err.message);
      }

    // 2. Read from local DB
    try {
      const dbData = readDb();
      const localUsers = dbData.users || [];
      localUsers.forEach(lu => {
        // Merge if not already present from Firestore
        if (!usersList.some(u => u.email === lu.email)) {
          usersList.push({
            id: lu.id || lu.email,
            name: lu.name || '',
            email: lu.email || '',
            role: lu.role || 'teacher',
            institutionId: lu.institutionId || 'yamanevler',
            institutionName: lu.institutionName || 'Yamanevler Enderun Bilişim',
            disabled: lu.disabled || false,
          });
        }
      });
    } catch (err) {
      console.warn("Local DB read failed:", err.message);
    }

    // 3. Guarantee seed accounts are ALWAYS in the list
    const seedAccounts = [
      {
        id: 'super-admin',
        name: 'Sistem Yöneticisi',
        email: 'admin@yeb.local',
        role: 'super_admin',
        institutionId: 'platform',
        institutionName: 'Sistem Yönetimi',
        disabled: false
      },
      {
        id: 'yeb-admin',
        name: 'Yamanevler Admin',
        email: 'yeb@2026.com',
        role: 'admin',
        institutionId: 'yamanevler',
        institutionName: 'Yamanevler Enderun Bilişim',
        disabled: false
      }
    ];

    seedAccounts.forEach(sa => {
      if (!usersList.some(u => u.email === sa.email)) {
        usersList.push(sa);
      }
    });

    return NextResponse.json({
      success: true,
      users: usersList
    });

  } catch (error) {
    console.error("List users API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
