import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const studentId     = searchParams.get('studentId');
  const rawInstId     = searchParams.get('institutionId') || '';
  const institutionId = rawInstId.trim().toLowerCase();

  let reportsMap = new Map();

  // 1. Local DB Read
  try {
    const dbData = readDb();
    const localReports = dbData.reports || [];
    localReports.forEach(r => {
      const rInst = (r.institution_id || r.institutionId || 'yamanevler').trim().toLowerCase();
      // Match institution (or match all if platform / empty inst)
      if (!institutionId || institutionId === 'platform' || rInst === institutionId) {
        if (!studentId || r.student_id === studentId) {
          reportsMap.set(r.id, { ...r, institution_id: rInst });
        }
      }
    });
  } catch (e) {
    console.warn('Local DB read warning in reports GET:', e.message);
  }

  // 2. Firestore Sync
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (projectId && apiKey) {
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports?key=${apiKey}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.documents) {
          data.documents.forEach(doc => {
            const fields = doc.fields || {};
            const id = doc.name.split('/').pop();
            const rInst = (fields.institution_id?.stringValue || fields.institutionId?.stringValue || 'yamanevler').trim().toLowerCase();
            const rStudentId = fields.student_id?.stringValue || fields.studentId?.stringValue || '';

            if (!institutionId || institutionId === 'platform' || rInst === institutionId) {
              if (!studentId || rStudentId === studentId) {
                const fsReport = {
                  id,
                  student_id:     rStudentId,
                  student_name:   fields.student_name?.stringValue || '',
                  class:          fields.class?.stringValue || '',
                  parent_phone:   fields.parent_phone?.stringValue || '',
                  content:        fields.content?.stringValue || '',
                  category:       fields.category?.stringValue || 'Diğer',
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
      }
    } catch (err) {
      console.warn('Firestore GET REPORTS warning:', err.message);
    }
  }

  const reports = Array.from(reportsMap.values());
  reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  return NextResponse.json({ success: true, reports });
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const {
      studentId, studentName, className, parentPhone,
      content, category, notifyParent, institutionId = 'yamanevler',
      createdBy
    } = await req.json();

    if (!studentId || !content) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi: Öğrenci ve içerik gereklidir.' }, { status: 400 });
    }

    const instId = (institutionId || 'yamanevler').trim().toLowerCase();
    const reportId = `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const newReport = {
      id: reportId,
      student_id:     studentId,
      student_name:   studentName || '',
      class:          className || '',
      parent_phone:   parentPhone || '',
      content,
      category:       category || 'Diğer',
      notified:       !!notifyParent,
      institution_id: instId,
      created_at:     nowIso,
      created_by:     createdBy || 'Bilinmeyen Öğretmen',
    };

    // 1. Local DB Save
    const dbData = readDb();
    dbData.reports = dbData.reports || [];
    dbData.reports.push(newReport);
    writeDb(dbData);

    // 2. Firestore Save
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (projectId && apiKey) {
      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${reportId}?key=${apiKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                student_id:     { stringValue: studentId },
                student_name:   { stringValue: studentName || '' },
                class:          { stringValue: className || '' },
                parent_phone:   { stringValue: parentPhone || '' },
                content:        { stringValue: content },
                category:       { stringValue: category || 'Diğer' },
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

    return NextResponse.json({ success: true, id: reportId, report: newReport });
  } catch (err) {
    console.error('ADD REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
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
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

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

// ─── PUT ─────────────────────────────────────────────────────────────────────
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
