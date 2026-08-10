import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// â”€â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId     = searchParams.get('studentId');
    const rawInstId     = searchParams.get('institutionId') || '';
    const institutionId = rawInstId.trim().toLowerCase();
    const normStudentId = studentId ? studentId.trim().toLowerCase() : null;

    let reportsMap = new Map();

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    if (projectId && apiKey) {
      try {
        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports?key=${apiKey}&pageSize=1000`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          const docs = data.documents || [];
          docs.forEach(doc => {
            const fields = doc.fields || {};
            const id = doc.name.split('/').pop();
            const rInst = (fields.institution_id?.stringValue || fields.institutionId?.stringValue || 'yamanevler').trim().toLowerCase();
            const rStudentId = (fields.student_id?.stringValue || fields.studentId?.stringValue || '').trim();
            const normRStudentId = rStudentId.toLowerCase();

            if (!institutionId || institutionId === 'platform' || rInst === institutionId) {
              if (!normStudentId || normRStudentId === normStudentId) {
                const fsReport = {
                  id,
                  student_id:     rStudentId,
                  student_name:   fields.student_name?.stringValue || '',
                  class:          fields.class?.stringValue || '',
                  parent_phone:   fields.parent_phone?.stringValue || '',
                  content:        fields.content?.stringValue || '',
                  category:       fields.category?.stringValue || 'Dahili',
                  isPositive:     fields.isPositive?.booleanValue !== false,
                  notified:       fields.notified?.booleanValue || false,
                  institution_id: rInst,
                  created_at:     fields.created_at?.timestampValue || fields.created_at?.stringValue || new Date().toISOString(),
                  created_by:     fields.created_by?.stringValue || 'Bilinmeyen Öğretmen',
                };
                reportsMap.set(id, fsReport);
              }
            }
          });
        }
      } catch (err) {
        console.warn('Firestore GET REPORTS warning:', err.message);
      }
    }

    // Fallback/Supplement from local DB
    try {
      const dbData = readDb();
      const localReports = dbData.reports || [];
      localReports.forEach(r => {
        const rInst = (r.institution_id || r.institutionId || 'yamanevler').trim().toLowerCase();
        const rStId = (r.student_id || r.studentId || '').trim().toLowerCase();
        if (!institutionId || institutionId === 'platform' || rInst === institutionId) {
          if (!normStudentId || rStId === normStudentId) {
            if (!reportsMap.has(r.id)) {
              reportsMap.set(r.id, { ...r, institution_id: rInst });
            }
          }
        }
      });
    } catch (e) {}

    const reports = Array.from(reportsMap.values());
    reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return NextResponse.json({ success: true, reports });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message, reports: [] }, { status: 500 });
  }
}

// â”€â”€â”€ POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      studentId, studentName, className, parentPhone,
      students, // Optional array for bulk reports: [{ studentId, studentName, className, parentPhone }]
      content, category, isPositive, notifyParent, institutionId = 'yamanevler',
      createdBy
    } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi: Rapor içeriği gereklidir.' }, { status: 400 });
    }

    const targetStudents = Array.isArray(students) && students.length > 0
      ? students
      : studentId ? [{ studentId, studentName, className, parentPhone }] : [];

    if (targetStudents.length === 0) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi: En az 1 öğrenci seçilmelidir.' }, { status: 400 });
    }

    const instId = (institutionId || 'yamanevler').trim().toLowerCase();
    const nowIso = new Date().toISOString();
    const createdReports = [];

    const dbData = readDb();
    dbData.reports = dbData.reports || [];

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    for (let i = 0; i < targetStudents.length; i++) {
      const item = targetStudents[i];
      const cleanStudentId = String(item.studentId || item.id).trim();
      const reportId = `report-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;

      const newReport = {
        id: reportId,
        student_id:     cleanStudentId,
        student_name:   item.studentName || item.name || '',
        class:          item.className || item.class || '',
        parent_phone:   item.parentPhone || item.parent_phone || '',
        content:        content.trim(),
        category:       category || 'Dahili',
        isPositive:     isPositive !== false,
        notified:       !!notifyParent,
        institution_id: instId,
        created_at:     nowIso,
        created_by:     createdBy || 'Bilinmeyen Öğretmen',
      };

      dbData.reports.push(newReport);
      createdReports.push(newReport);

      if (projectId && apiKey) {
        try {
          await fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${reportId}?key=${apiKey}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  student_id:     { stringValue: cleanStudentId },
                  student_name:   { stringValue: item.studentName || item.name || '' },
                  class:          { stringValue: item.className || item.class || '' },
                  parent_phone:   { stringValue: item.parentPhone || item.parent_phone || '' },
                  content:        { stringValue: content.trim() },
                  category:       { stringValue: category || 'Dahili' },
                  isPositive:     { booleanValue: isPositive !== false },
                  notified:       { booleanValue: !!notifyParent },
                  institution_id: { stringValue: instId },
                  created_at:     { timestampValue: nowIso },
                  created_by:     { stringValue: createdBy || 'Bilinmeyen Öğretmen' },
                },
              }),
            }
          );
        } catch (err) {
          console.warn('Firestore POST REPORT warning:', err.message);
        }
      }
    }

    // 1. Local DB Save
    writeDb(dbData);

    return NextResponse.json({
      success: true,
      count: createdReports.length,
      reports: createdReports,
      id: createdReports[0]?.id
    });
  } catch (err) {
    console.error('ADD REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// â”€â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Rapor ID eksik.' }, { status: 400 });

    // 1. Local DB Delete
    const dbData = readDb();
    if (dbData.reports) {
      dbData.reports = dbData.reports.filter(r => r.id !== id);
      writeDb(dbData);
    }

    // 2. Firestore Delete
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    if (projectId && apiKey) {
      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${id}?key=${apiKey}`,
          { method: 'DELETE' }
        );
      } catch (err) {
        console.warn('Firestore DELETE REPORT warning:', err.message);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('DELETE REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// â”€â”€â”€ PUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function PUT(req) {
  try {
    const { id, notified } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'ID eksik.' }, { status: 400 });

    const dbData = readDb();
    if (dbData.reports) {
      dbData.reports = dbData.reports.map(r =>
        r.id === id ? { ...r, notified: !!notified } : r
      );
      writeDb(dbData);
    }

    // 2. Firestore Sync
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    if (projectId && apiKey) {
      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${id}?updateMask.fieldPaths=notified&key=${apiKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                notified: { booleanValue: !!notified }
              }
            }),
          }
        );
      } catch (err) {
        console.warn('Firestore PUT REPORT warning:', err.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

