import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';

export const dynamic = 'force-dynamic';

// ─── Firestore REST helpers ──────────────────────────────────────────────────
function getFirestoreConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
  return { projectId, apiKey };
}

function fsUrl(projectId, apiKey, path, extra = '') {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}${extra}`;
}

function docToStudent(doc) {
  const fields = doc.fields || {};
  const id     = doc.name.split('/').pop();
  return {
    id,
    name:           fields.name?.stringValue           || '',
    surname:        fields.surname?.stringValue         || '',
    class:          fields.class?.stringValue           || '',
    parent_phone:   fields.parent_phone?.stringValue    || '',
    institution_id: normalizeInstitutionId(fields.institution_id?.stringValue || fields.institutionId?.stringValue || ''),
    created_at:     fields.created_at?.timestampValue   || fields.created_at?.stringValue || null,
    checkout_time:  fields.checkout_time?.stringValue   || null,
    last_report_date: null,
    status: 'Rapor Yok',
  };
}

// Fetch ALL docs from a Firestore collection with strict timeout
async function fetchAllDocs(projectId, apiKey, collection, timeoutMs = 1200) {
  const docs = [];
  let pageToken = '';
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    do {
      const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const url = fsUrl(projectId, apiKey, collection, `&pageSize=300${tokenParam}`);
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) break;
      const data = await res.json();
      if (data.error) break;
      (data.documents || []).forEach(d => docs.push(d));
      pageToken = data.nextPageToken || '';
    } while (pageToken);
  } catch (err) {
    // Timeout or network/quota error
  } finally {
    clearTimeout(t);
  }
  return docs;
}

// ─── Status helper ───────────────────────────────────────────────────────────
function buildStatus(reports) {
  if (!reports || reports.length === 0) return { last_report_date: null, status: 'Rapor Yok', report_count: 0 };
  reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const c = (reports[0].content || '').toLowerCase();
  let status = 'Orta';
  if (c.includes('gelmedi') || c.includes('kavga') || c.includes('hasta') || c.includes('dikkat') || c.includes('kutU') || c.includes('uyari') || c.includes('uyudu') || c.includes('kaynatti') || c.includes('inmedi')) {
    status = 'Dikkat';
  } else if (c.includes('katildi') || c.includes('iyi') || c.includes('basarili') || c.includes('aktif') || c.includes('tebrik') || c.includes('tam')) {
    status = 'İyi';
  }
  return { last_report_date: reports[0].created_at, status, report_count: reports.length };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { projectId, apiKey } = getFirestoreConfig();
  const { searchParams } = new URL(req.url);
  const rawInstId  = searchParams.get('institutionId') || '';
  const normInstId = rawInstId ? normalizeInstitutionId(rawInstId) : '';

  const dbData = readDb();
  const deletedSet = new Set(dbData.deleted_students || []);

  const reportsByStudent = {};

  // 1. Populate reportsByStudent from Local DB
  try {
    (dbData.reports || []).forEach(r => {
      const ri = normalizeInstitutionId(r.institution_id || r.institutionId || 'bolu-kilicaslan');
      const si = (r.student_id || r.studentId || '').trim();
      if (!normInstId || normInstId === 'platform' || isInstitutionMatch(ri, normInstId)) {
        if (!reportsByStudent[si]) reportsByStudent[si] = [];
        reportsByStudent[si].push({
          content: r.content || '',
          created_at: r.created_at || null,
        });
      }
    });
  } catch (e) {}

  let students = [];
  try {
    const studentDocs = await fetchAllDocs(projectId, apiKey, 'students');
    students = studentDocs
      .map(docToStudent)
      .filter(s => !deletedSet.has(s.id) && (!normInstId || normInstId === 'platform' || isInstitutionMatch(s.institution_id, normInstId)));

    try {
      const reportDocs = await fetchAllDocs(projectId, apiKey, 'reports');
      reportDocs.forEach(doc => {
        const f  = doc.fields || {};
        const ri = normalizeInstitutionId(f.institution_id?.stringValue || f.institutionId?.stringValue || '');
        const si = (f.student_id?.stringValue || f.studentId?.stringValue || '').trim();
        if (!normInstId || normInstId === 'platform' || isInstitutionMatch(ri, normInstId)) {
          if (!reportsByStudent[si]) reportsByStudent[si] = [];
          const createdAt = f.created_at?.timestampValue || f.created_at?.stringValue || null;
          if (!reportsByStudent[si].some(ex => ex.created_at === createdAt)) {
            reportsByStudent[si].push({
              content: f.content?.stringValue || '',
              created_at: createdAt,
            });
          }
        }
      });
    } catch (rErr) {
      console.warn('GET REPORTS Firestore warn:', rErr.message);
    }
  } catch (err) {
    console.warn('GET STUDENTS Firestore warn:', err.message);
  }

  // 2. Fallback / Merge with Local DB if Firestore was empty or missing some
  try {
    const localStudents = (dbData.students || []).filter(
      s => !deletedSet.has(s.id) && (!normInstId || normInstId === 'platform' || isInstitutionMatch(s.institution_id || s.institutionId || 'bolu-kilicaslan', normInstId))
    );

    localStudents.forEach(ls => {
      if (!students.some(s => s.id === ls.id)) {
        students.push({
          id: ls.id,
          name: ls.name || '',
          surname: ls.surname || '',
          class: ls.class || '',
          parent_phone: ls.parent_phone || '',
          institution_id: normalizeInstitutionId(ls.institution_id || ls.institutionId || 'bolu-kilicaslan'),
          created_at: ls.created_at || null,
          checkout_time: ls.checkout_time || null,
        });
      }
    });
  } catch (dbErr) {
    console.warn('Local DB fallback read error:', dbErr.message);
  }

  // 3. Attach report statistics to all students
  students = students.map(s => {
    const info = buildStatus(reportsByStudent[s.id] || []);
    return {
      ...s,
      ...info,
      report_count: (reportsByStudent[s.id] || []).length,
    };
  });

  students.sort((a, b) => (a.surname || '').localeCompare(b.surname || '', 'tr'));
  return NextResponse.json({ success: true, students });
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  const { projectId, apiKey } = getFirestoreConfig();

  try {
    const body = await req.json();

    // Bulk student creation
    if (Array.isArray(body.students)) {
      const instId = normalizeInstitutionId(body.institutionId || 'bolu-kilicaslan');
      const { students } = body;
      const created = [];

      for (let i = 0; i < students.length; i++) {
        const item = students[i];
        if (!item) continue;
        const name         = (item.name         || '').trim().slice(0, 50);
        const surname      = (item.surname       || '').trim().slice(0, 50);
        const studentClass = (item.studentClass  || '').trim().slice(0, 20);
        const parentPhone  = (item.parentPhone   || '').trim().slice(0, 20);
        if (!name || !surname || !studentClass) continue;

        const stId = `student-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
        const now  = new Date().toISOString();

        try {
          await fetch(
            fsUrl(projectId, apiKey, `students/${stId}`),
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  name:           { stringValue: name },
                  surname:        { stringValue: surname },
                  class:          { stringValue: studentClass },
                  parent_phone:   { stringValue: parentPhone },
                  institution_id: { stringValue: instId },
                  created_at:     { timestampValue: now },
                },
              }),
            }
          );
        } catch (fsErr) {
          console.warn('Firestore bulk student add warn:', fsErr.message);
        }

        created.push({ id: stId, name, surname, class: studentClass, parent_phone: parentPhone, institution_id: instId, created_at: now });
      }

      // Sync with local DB
      try {
        const dbData = readDb();
        if (!dbData.students) dbData.students = [];
        if (dbData.deleted_students) {
          const createdIds = new Set(created.map(c => c.id));
          dbData.deleted_students = dbData.deleted_students.filter(id => !createdIds.has(id));
        }
        dbData.students = [...created, ...dbData.students];
        writeDb(dbData);
      } catch (dbErr) {
        console.warn('Local DB bulk add error:', dbErr.message);
      }

      return NextResponse.json({ success: true, count: created.length, students: created });
    }

    const { name, surname, studentClass, parentPhone, institutionId = 'bolu-kilicaslan' } = body;
    if (!name || !surname || !studentClass) {
      return NextResponse.json({ success: false, error: 'Ad, Soyad ve Sınıf zorunludur.' }, { status: 400 });
    }

    const instId = normalizeInstitutionId(institutionId);
    const stId = `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now  = new Date().toISOString();

    const newStudent = {
      id: stId,
      name: name.trim(),
      surname: surname.trim(),
      class: studentClass.trim(),
      parent_phone: parentPhone ? parentPhone.trim() : '',
      institution_id: instId,
      created_at: now,
      last_report_date: null,
      status: 'Rapor Yok',
    };

    // Save to local DB first (instant & reliable)
    try {
      const dbData = readDb();
      if (!dbData.students) dbData.students = [];
      if (dbData.deleted_students) {
        dbData.deleted_students = dbData.deleted_students.filter(did => did !== stId);
      }
      dbData.students.unshift(newStudent);
      writeDb(dbData);
    } catch (dbErr) {
      console.warn('Local DB add error:', dbErr.message);
    }

    // Save to Firestore in background / await
    try {
      const fsRes = await fetch(
        fsUrl(projectId, apiKey, `students/${stId}`),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              name:           { stringValue: newStudent.name.slice(0, 50) },
              surname:        { stringValue: newStudent.surname.slice(0, 50) },
              class:          { stringValue: newStudent.class.slice(0, 20) },
              parent_phone:   { stringValue: newStudent.parent_phone.slice(0, 20) },
              institution_id: { stringValue: newStudent.institution_id },
              created_at:     { timestampValue: now },
            },
          }),
        }
      );

      if (!fsRes.ok) {
        console.warn('Firestore POST student error status:', fsRes.status);
      }
    } catch (fsErr) {
      console.warn('Firestore write warn (local DB already saved):', fsErr.message);
    }

    return NextResponse.json({ success: true, id: stId, student: newStudent });
  } catch (err) {
    console.error('POST STUDENT ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  const { projectId, apiKey } = getFirestoreConfig();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'ID parametresi eksik.' }, { status: 400 });
  }

  try {
    // 1. Yerel DB'den anında ve kesin olarak sil + deleted_students listesine al
    try {
      const dbData = readDb();
      if (dbData.students) {
        dbData.students = dbData.students.filter(s => s.id !== id);
      }
      if (dbData.reports) {
        dbData.reports = dbData.reports.filter(r => r.student_id !== id && r.studentId !== id);
      }
      if (!dbData.deleted_students) dbData.deleted_students = [];
      if (!dbData.deleted_students.includes(id)) {
        dbData.deleted_students.push(id);
      }
      writeDb(dbData);
    } catch (localErr) {
      console.warn('Local DB delete error:', localErr.message);
    }

    // 2. Firestore'dan sil
    try {
      const delRes = await fetch(
        fsUrl(projectId, apiKey, `students/${id}`),
        { method: 'DELETE' }
      );
      if (!delRes.ok && delRes.status !== 404) {
        console.warn('Firestore student delete HTTP:', delRes.status);
      }
    } catch (fsErr) {
      console.warn('Firestore delete student error:', fsErr.message);
    }

    // 3. Firestore'daki ilgili raporları temizle
    try {
      const reportDocs = await fetchAllDocs(projectId, apiKey, 'reports');
      const toDelete   = reportDocs.filter(d => (d.fields?.student_id?.stringValue === id || d.fields?.studentId?.stringValue === id));
      await Promise.all(
        toDelete.map(d => {
          const reportId = d.name.split('/').pop();
          return fetch(fsUrl(projectId, apiKey, `reports/${reportId}`), { method: 'DELETE' });
        })
      );
    } catch (e) {
      console.warn('Report cleanup error (non-fatal):', e.message);
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('DELETE STUDENT ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT (update phone / checkout) ───────────────────────────────────────────
export async function PUT(req) {
  const { projectId, apiKey } = getFirestoreConfig();

  try {
    const body = await req.json();
    const { id, parentPhone, checkout_time } = body;
    if (!id) return NextResponse.json({ success: false, error: 'Öğrenci ID eksik.' }, { status: 400 });

    const updateFields = {};
    const fieldMasks = [];

    if (parentPhone !== undefined) {
      updateFields.parent_phone = { stringValue: parentPhone || '' };
      fieldMasks.push('updateMask.fieldPaths=parent_phone');
    }

    if (checkout_time !== undefined) {
      if (checkout_time) {
        updateFields.checkout_time = { stringValue: checkout_time };
      } else {
        updateFields.checkout_time = { stringValue: '' };
      }
      fieldMasks.push('updateMask.fieldPaths=checkout_time');
    }

    // 1. Sync to local DB
    try {
      const dbData = readDb();
      if (dbData.students) {
        const idx = dbData.students.findIndex(s => s.id === id);
        if (idx !== -1) {
          if (parentPhone !== undefined) dbData.students[idx].parent_phone = parentPhone || '';
          if (checkout_time !== undefined) dbData.students[idx].checkout_time = checkout_time || null;
          writeDb(dbData);
        }
      }
    } catch (e) {
      console.warn('Local DB PUT student error:', e.message);
    }

    // 2. Sync to Firestore
    if (fieldMasks.length > 0) {
      try {
        await fetch(
          fsUrl(projectId, apiKey, `students/${id}`, `&${fieldMasks.join('&')}`),
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: updateFields }),
          }
        );
      } catch (fsErr) {
        console.warn('Firestore PUT student warn:', fsErr.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT STUDENT ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
