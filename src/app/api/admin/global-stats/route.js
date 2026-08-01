import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

const FIREBASE_API_KEY    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyA1UmjpiDX47qk8c6tJoM1xkJbRMGIsqfg';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'student-687f2';

export async function GET(req) {
  try {
    let allUsers = [];
    let allStudents = [];
    let allReports = [];
    let allLeaves = [];
    let allFirestoreInsts = [];

    // --- 1. Fetch Users ---
    try {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allUsers = (data.documents || []).map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            name: f.name?.stringValue || '',
            email: f.email?.stringValue || '',
            role: f.role?.stringValue || 'teacher',
            institutionId: f.institutionId?.stringValue || 'yamanevler',
            institutionName: f.institutionName?.stringValue || 'Yamanevler Enderun Bilişim',
            disabled: f.disabled?.booleanValue || false
          };
        });
      }
    } catch (err) {
      console.warn("Firestore fetch users failed in global-stats:", err.message);
    }

    // --- 1b. Fetch Institutions collection directly ---
    try {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/institutions?key=${FIREBASE_API_KEY}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allFirestoreInsts = (data.documents || []).map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            name: f.name?.stringValue || '',
            email: f.email?.stringValue || '',
            logoUrl: f.logoUrl?.stringValue || '',
            primaryColor: f.primaryColor?.stringValue || '#06429c',
            disabled: f.disabled?.booleanValue || false,
          };
        });
      }
    } catch (err) {
      console.warn("Firestore fetch institutions failed in global-stats:", err.message);
    }

    // --- 2. Fetch Students ---
    try {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/students?key=${FIREBASE_API_KEY}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allStudents = (data.documents || []).map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            name: f.name?.stringValue || '',
            surname: f.surname?.stringValue || '',
            class: f.class?.stringValue || '',
            institutionId: f.institutionId?.stringValue || 'yamanevler'
          };
        });
      }
    } catch (err) {
      console.warn("Firestore fetch students failed in global-stats:", err.message);
    }

    // --- 3. Fetch Reports ---
    try {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/reports?key=${FIREBASE_API_KEY}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allReports = (data.documents || []).map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            student_id: f.student_id?.stringValue || '',
            category: f.category?.stringValue || 'Diğer',
            created_at: f.created_at?.stringValue || '',
            institutionId: f.institutionId?.stringValue || 'yamanevler'
          };
        });
      }
    } catch (err) {
      console.warn("Firestore fetch reports failed in global-stats:", err.message);
    }

    // --- 4. Fetch Leaves ---
    try {
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/leaveRequests?key=${FIREBASE_API_KEY}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        allLeaves = (data.documents || []).map(doc => {
          const f = doc.fields || {};
          return {
            id: doc.name.split('/').pop(),
            status: f.status?.stringValue || 'pending',
            institutionId: f.institutionId?.stringValue || 'yamanevler'
          };
        });
      }
    } catch (err) {
      console.warn("Firestore fetch leaves failed in global-stats:", err.message);
    }

    // --- 5. Merge local DB ---
    let localInsts = [];
    try {
      const dbData = readDb();
      localInsts = dbData.institutions || [];
      
      // Merge local users
      (dbData.users || []).forEach(lu => {
        if (!allUsers.some(u => u.email === lu.email)) {
          allUsers.push({
            id: lu.id || lu.email,
            name: lu.name || '',
            email: lu.email || '',
            role: lu.role || 'teacher',
            institutionId: lu.institutionId || 'yamanevler',
            institutionName: lu.institutionName || 'Yamanevler Enderun Bilişim',
            disabled: lu.disabled || false
          });
        }
      });

      // Merge local students
      (dbData.students || []).forEach(ls => {
        if (!allStudents.some(s => s.id === ls.id)) {
          allStudents.push({
            id: ls.id,
            name: ls.name || '',
            surname: ls.surname || '',
            class: ls.class || '',
            institutionId: ls.institution_id || 'yamanevler'
          });
        }
      });

      // Merge local reports
      (dbData.reports || []).forEach(lr => {
        if (!allReports.some(r => r.id === lr.id)) {
          // find student to get institutionId if not present
          const st = allStudents.find(s => s.id === lr.student_id);
          allReports.push({
            id: lr.id,
            student_id: lr.student_id || '',
            category: lr.category || 'Diğer',
            created_at: lr.created_at || '',
            institutionId: lr.institutionId || st?.institutionId || 'yamanevler'
          });
        }
      });

      // Merge local leaves
      (dbData.leaveRequests || []).forEach(ll => {
        if (!allLeaves.some(l => l.id === ll.id)) {
          allLeaves.push({
            id: ll.id,
            status: ll.status || 'pending',
            institutionId: ll.institutionId || 'yamanevler'
          });
        }
      });

    } catch (err) {
      console.warn("Local DB merge in global-stats failed:", err.message);
    }

    // Guarantee seeds are in allUsers list
    const seedAccounts = [
      {
        id: 'super-admin-alihan',
        name: 'Alihan (Süper Yönetici)',
        email: 'alihan@2026',
        role: 'super_admin',
        institutionId: 'platform',
        institutionName: 'Sistem Yönetimi',
        disabled: false
      },
      {
        id: 'super-admin',
        name: 'Sistem Yöneticisi',
        email: 'admin@yeb.local',
        role: 'super_admin',
        institutionId: 'platform',
        institutionName: 'Sistem Yönetimi',
        disabled: false
      }
    ];
    seedAccounts.forEach(sa => {
      if (!allUsers.some(u => u.email === sa.email)) {
        allUsers.push(sa);
      }
    });

    // --- 6. Group and Calculate ---
    const instGroup = {};

    // First populate from Firestore institutions collection (highest priority)
    allFirestoreInsts.forEach(fi => {
      instGroup[fi.id] = {
        id: fi.id,
        name: fi.name || fi.id,
        email: fi.email || '',
        logoUrl: fi.logoUrl || '',
        primaryColor: fi.primaryColor || '#06429c',
        enabledModules: { ai: true, leave: true, tv: true, weekly: true },
        studentCount: 0,
        reportCount: 0,
        userCount: 0,
        pendingLeaveCount: 0,
        disabled: !!fi.disabled
      };
    });

    // Then merge from localInsts (fills in enabledModules and any local-only kurumlar)
    localInsts.forEach(li => {
      if (instGroup[li.id]) {
        // Already from Firestore — supplement missing fields only
        instGroup[li.id].enabledModules = li.enabledModules || instGroup[li.id].enabledModules;
        if (!instGroup[li.id].logoUrl && li.logoUrl) instGroup[li.id].logoUrl = li.logoUrl;
      } else {
        instGroup[li.id] = {
          id: li.id,
          name: li.name || li.id,
          email: li.email || '',
          logoUrl: li.logoUrl || '',
          primaryColor: li.primaryColor || '#06429c',
          enabledModules: li.enabledModules || { ai: true, leave: true, tv: true, weekly: true },
          studentCount: 0,
          reportCount: 0,
          userCount: 0,
          pendingLeaveCount: 0,
          disabled: !!li.disabled
        };
      }
    });

    // Group from users to find all institutions
    allUsers.forEach(u => {
      if (u.institutionId === 'platform') return;
      const key = u.institutionId;
      if (!instGroup[key]) {
        instGroup[key] = {
          id: key,
          name: u.institutionName || key,
          email: u.email || '',
          logoUrl: '',
          primaryColor: '#06429c',
          enabledModules: { ai: true, leave: true, tv: true, weekly: true },
          studentCount: 0,
          reportCount: 0,
          userCount: 0,
          pendingLeaveCount: 0,
          disabled: false
        };
      }
      if (u.disabled) {
        instGroup[key].disabled = true;
      }
      instGroup[key].userCount++;
    });

    // Add count data for students
    allStudents.forEach(s => {
      const key = s.institutionId || 'yamanevler';
      if (!instGroup[key]) {
        instGroup[key] = {
          id: key,
          name: key,
          studentCount: 0,
          reportCount: 0,
          userCount: 0,
          pendingLeaveCount: 0,
          disabled: false
        };
      }
      instGroup[key].studentCount++;
    });

    // Add count data for reports
    allReports.forEach(r => {
      const key = r.institutionId || 'yamanevler';
      if (!instGroup[key]) {
        instGroup[key] = {
          id: key,
          name: key,
          studentCount: 0,
          reportCount: 0,
          userCount: 0,
          pendingLeaveCount: 0,
          disabled: false
        };
      }
      instGroup[key].reportCount++;
    });

    // Add count data for leaves
    allLeaves.forEach(l => {
      if (l.status !== 'pending') return;
      const key = l.institutionId || 'yamanevler';
      if (!instGroup[key]) {
        instGroup[key] = {
          id: key,
          name: key,
          studentCount: 0,
          reportCount: 0,
          userCount: 0,
          pendingLeaveCount: 0,
          disabled: false
        };
      }
      instGroup[key].pendingLeaveCount++;
    });

    // Totals
    const totalInsts = Object.keys(instGroup).length;
    const totalStudents = allStudents.length;
    const totalReports = allReports.length;
    const totalUsers = allUsers.filter(u => u.institutionId !== 'platform').length;
    const totalPendingLeaves = allLeaves.filter(l => l.status === 'pending').length;

    return NextResponse.json({
      success: true,
      stats: {
        totalInsts,
        totalStudents,
        totalReports,
        totalUsers,
        totalPendingLeaves,
        institutions: Object.values(instGroup)
      }
    });

  } catch (error) {
    console.error("Global stats API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
