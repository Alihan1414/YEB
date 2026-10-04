import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';

export const dynamic = 'force-dynamic';

function calculateStudentStatus(reports) {
  if (!reports || reports.length === 0) {
    return { last_report_date: null, status: 'Rapor Yok', report_count: 0 };
  }
  const sorted = [...reports].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const latest = sorted[0];
  const c = (latest.content || '').toLowerCase();
  let status = 'Orta';
  if (latest.isPositive === false || c.includes('gelmedi') || c.includes('kavga') || c.includes('hasta') || c.includes('dikkat') || c.includes('uyari') || c.includes('uyudu') || c.includes('inmedi')) {
    status = 'Dikkat';
  } else if (latest.isPositive === true || c.includes('katildi') || c.includes('iyi') || c.includes('basarili') || c.includes('aktif') || c.includes('tebrik') || c.includes('tam')) {
    status = 'İyi';
  }
  return {
    last_report_date: latest.created_at || new Date().toISOString(),
    status,
    report_count: sorted.length
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId     = searchParams.get('studentId');
    const rawInstId     = searchParams.get('institutionId') || '';
    const institutionId = rawInstId ? normalizeInstitutionId(rawInstId) : '';
    const normStudentId = studentId ? studentId.trim().toLowerCase() : null;

    let reportsMap = new Map();

    // 1. First populate from Local DB (always available & instant)
    try {
      const dbData = readDb();
      const localReports = dbData.reports || [];
      localReports.forEach(r => {
        const rInst = normalizeInstitutionId(r.institution_id || r.institutionId || 'bolu-kilicaslan');
        const rStId = (r.student_id || r.studentId || '').trim();
        const normRStId = rStId.toLowerCase();

        const isStudentMatch = !normStudentId || normRStId === normStudentId;
        const isInstMatch    = !institutionId || institutionId === 'platform' || isInstitutionMatch(rInst, institutionId);

        if (isStudentMatch && isInstMatch) {
          reportsMap.set(r.id, {
            ...r,
            student_id: rStId,
            studentId: rStId,
            institution_id: rInst,
            institutionId: rInst
          });
        }
      });
    } catch (e) {}

    // 2. Supplement from Firestore with strict 1.2s timeout
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    if (projectId && apiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);

      try {
        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports?key=${apiKey}&pageSize=1000`,
          { cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const docs = data.documents || [];
          docs.forEach(doc => {
            const fields = doc.fields || {};
            const id = doc.name.split('/').pop();
            const rInst = normalizeInstitutionId(fields.institution_id?.stringValue || fields.institutionId?.stringValue || 'bolu-kilicaslan');
            const rStudentId = (fields.student_id?.stringValue || fields.studentId?.stringValue || '').trim();
            const normRStudentId = rStudentId.toLowerCase();

            const isStudentMatch = !normStudentId || normRStudentId === normStudentId;
            const isInstMatch    = !institutionId || institutionId === 'platform' || isInstitutionMatch(rInst, institutionId);

            if (isStudentMatch && isInstMatch) {
              if (!reportsMap.has(id)) {
                const fsReport = {
                  id,
                  student_id:     rStudentId,
                  studentId:      rStudentId,
                  student_name:   fields.student_name?.stringValue || '',
                  class:          fields.class?.stringValue || '',
                  parent_phone:   fields.parent_phone?.stringValue || '',
                  content:        fields.content?.stringValue || '',
                  category:       fields.category?.stringValue || 'Dahili',
                  isPositive:     fields.isPositive?.booleanValue !== false,
                  notified:       fields.notified?.booleanValue || false,
                  institution_id: rInst,
                  institutionId:  rInst,
                  created_at:     fields.created_at?.timestampValue || fields.created_at?.stringValue || new Date().toISOString(),
                  created_by:     fields.created_by?.stringValue || 'Bilinmeyen Öğretmen',
                };
                reportsMap.set(id, fsReport);
              }
            }
          });
        }
      } catch (err) {
        clearTimeout(timeout);
      }
    }

    const reports = Array.from(reportsMap.values());
    reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return NextResponse.json({ success: true, reports });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message, reports: [] }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const {
      studentId, studentName, className, parentPhone,
      content, category, isPositive, notifyParent, institutionId = 'bolu-kilicaslan',
      createdBy
    } = await req.json();

    if (!studentId || !content) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi: Öğrenci ve içerik gereklidir.' }, { status: 400 });
    }

    const instId = normalizeInstitutionId(institutionId);
    const cleanStudentId = String(studentId).trim();
    const reportId = `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const newReport = {
      id: reportId,
      student_id:     cleanStudentId,
      studentId:      cleanStudentId,
      student_name:   studentName || '',
      studentName:    studentName || '',
      class:          className || '',
      parent_phone:   parentPhone || '',
      parentPhone:    parentPhone || '',
      content:        content.trim(),
      category:       category || 'Dahili',
      isPositive:     isPositive !== false,
      notified:       !!notifyParent,
      institution_id: instId,
      institutionId:  instId,
      created_at:     nowIso,
      created_by:     createdBy || 'Bilinmeyen Öğretmen',
    };

    // 1. Local DB Save: save report AND update student stats immediately
    try {
      const dbData = readDb();
      dbData.reports = dbData.reports || [];
      dbData.reports = dbData.reports.filter(r => r.id !== reportId);
      dbData.reports.unshift(newReport);

      // Update student's report stats directly in dbData.students
      if (dbData.students && Array.isArray(dbData.students)) {
        const studentReports = dbData.reports.filter(r => {
          const sid = (r.student_id || r.studentId || '').trim();
          return sid === cleanStudentId;
        });
        const stats = calculateStudentStatus(studentReports);
        
        dbData.students = dbData.students.map(st => {
          if (st.id === cleanStudentId) {
            return {
              ...st,
              report_count: stats.report_count,
              last_report_date: stats.last_report_date,
              status: stats.status,
            };
          }
          return st;
        });
      }

      writeDb(dbData);
    } catch (dbErr) {
      console.error("Local DB Save error:", dbErr.message);
    }

    // 2. Firestore Save (non-blocking / fast attempt)
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    if (projectId && apiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);

      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${reportId}?key=${apiKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              fields: {
                student_id:     { stringValue: cleanStudentId },
                studentId:      { stringValue: cleanStudentId },
                student_name:   { stringValue: studentName || '' },
                class:          { stringValue: className || '' },
                parent_phone:   { stringValue: parentPhone || '' },
                content:        { stringValue: content.trim() },
                category:       { stringValue: category || 'Dahili' },
                isPositive:     { booleanValue: isPositive !== false },
                notified:       { booleanValue: !!notifyParent },
                institution_id: { stringValue: instId },
                institutionId:  { stringValue: instId },
                created_at:     { stringValue: nowIso },
                created_by:     { stringValue: createdBy || 'Bilinmeyen Öğretmen' },
              },
            }),
          }
        );
        clearTimeout(timeout);
      } catch (err) {
        clearTimeout(timeout);
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

    // 1. Local DB Delete and student stats update
    const dbData = readDb();
    let targetStudentId = null;

    if (dbData.reports) {
      const targetReport = dbData.reports.find(r => r.id === id);
      if (targetReport) {
        targetStudentId = (targetReport.student_id || targetReport.studentId || '').trim();
      }
      dbData.reports = dbData.reports.filter(r => r.id !== id);

      // Recalculate student stats
      if (targetStudentId && dbData.students) {
        const remainingForStudent = dbData.reports.filter(r => (r.student_id || r.studentId || '').trim() === targetStudentId);
        const stats = calculateStudentStatus(remainingForStudent);
        dbData.students = dbData.students.map(st => {
          if (st.id === targetStudentId) {
            return {
              ...st,
              report_count: stats.report_count,
              last_report_date: stats.last_report_date,
              status: stats.status,
            };
          }
          return st;
        });
      }

      writeDb(dbData);
    }

    // 2. Firestore Delete (non-blocking)
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    if (projectId && apiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);

      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${id}?key=${apiKey}`,
          { method: 'DELETE', signal: controller.signal }
        );
        clearTimeout(timeout);
      } catch (err) {
        clearTimeout(timeout);
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

    return NextResponse.json({ success: true, id, notified: !!notified });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
