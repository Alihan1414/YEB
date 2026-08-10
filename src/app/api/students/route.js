import { NextResponse } from 'next/server';

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
    institution_id: fields.institution_id?.stringValue  || '',
    created_at:     fields.created_at?.timestampValue   || fields.created_at?.stringValue || null,
    last_report_date: null,
    status: 'Rapor Yok',
  };
}

// Fetch ALL docs from a Firestore collection (handles pagination)
async function fetchAllDocs(projectId, apiKey, collection) {
  const docs = [];
  let pageToken = '';
  do {
    const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
    const url = fsUrl(projectId, apiKey, collection, `&pageSize=300${tokenParam}`);
    const res  = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Firestore error');
    (data.documents || []).forEach(d => docs.push(d));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// ─── Status helper ───────────────────────────────────────────────────────────
function buildStatus(reports) {
  if (!reports || reports.length === 0) return { last_report_date: null, status: 'Rapor Yok' };
  reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const c = (reports[0].content || '').toLowerCase();
  let status = 'Orta';
  if (c.includes('gelmedi') || c.includes('kavga') || c.includes('hasta') || c.includes('dikkat') || c.includes('kutU') || c.includes('uyari')) {
    status = 'Dikkat';
  } else if (c.includes('katildi') || c.includes('iyi') || c.includes('basarili') || c.includes('aktif') || c.includes('tebrik')) {
    status = 'İyi';
  }
  return { last_report_date: reports[0].created_at, status };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { projectId, apiKey } = getFirestoreConfig();
  const { searchParams } = new URL(req.url);
  const rawInstId  = searchParams.get('institutionId') || '';
  const normInstId = rawInstId.trim().toLowerCase();

  let students = [];
  try {
    const studentDocs = await fetchAllDocs(projectId, apiKey, 'students');
    students = studentDocs
      .map(docToStudent)
      .filter(s => !normInstId || s.institution_id.trim().toLowerCase() === normInstId);

    const reportDocs = await fetchAllDocs(projectId, apiKey, 'reports');
    const reportsByStudent = {};
    reportDocs.forEach(doc => {
      const f  = doc.fields || {};
      const ri = (f.institution_id?.stringValue || '').trim().toLowerCase();
      const si = f.student_id?.stringValue || '';
      if (!normInstId || ri === normInstId) {
        if (!reportsByStudent[si]) reportsByStudent[si] = [];
        reportsByStudent[si].push({
          content:    f.content?.stringValue || '',
          created_at: f.created_at?.timestampValue || f.created_at?.stringValue || null,
        });
      }
    });

    students = students.map(s => {
      const info = buildStatus(reportsByStudent[s.id] || []);
      return { ...s, ...info };
    });

  } catch (err) {
    console.warn('GET STUDENTS Firestore warn:', err.message);
  }

  // Fallback / Merge with Local DB if Firestore was empty or failed
  try {
    const { readDb } = require('@/lib/db');
    const dbData = readDb();
    const localStudents = (dbData.students || []).filter(
      s => !normInstId || (s.institution_id || s.institutionId || '').trim().toLowerCase() === normInstId
    );

    localStudents.forEach(ls => {
      if (!students.some(s => s.id === ls.id)) {
        students.push({
          id: ls.id,
          name: ls.name || '',
          surname: ls.surname || '',
          class: ls.class || '',
          parent_phone: ls.parent_phone || '',
          institution_id: ls.institution_id || ls.institutionId || '',
          created_at: ls.created_at || null,
          last_report_date: null,
          status: 'Rapor Yok'
        });
      }
    });
  } catch (dbErr) {
    console.warn('Local DB fallback read error:', dbErr.message);
  }

  students.sort((a, b) => (a.surname || '').localeCompare(b.surname || '', 'tr'));
  return NextResponse.json({ success: true, students });
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  const { projectId, apiKey } = getFirestoreConfig();

  try {
    const body = await req.json();

    if (body.students && Array.isArray(body.students)) {
      const { students, institutionId = 'yamanevler' } = body;
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

        const res = await fetch(
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
                institution_id: { stringValue: institutionId.trim() },
                created_at:     { timestampValue: now },
              },
            }),
          }
        );

        if (res.ok) {
          created.push({ id: stId, name, surname, class: studentClass, parent_phone: parentPhone, institution_id: institutionId.trim(), created_at: now });
        }
      }

      return NextResponse.json({ success: true, count: created.length, students: created });
    }

    const { name, surname, studentClass, parentPhone, institutionId = 'yamanevler' } = body;
    if (!name || !surname || !studentClass) {
      return NextResponse.json({ success: false, error: 'Ad, Soyad ve Sinif zorunludur.' }, { status: 400 });
    }

    const stId = `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now  = new Date().toISOString();

    const fsRes = await fetch(
      fsUrl(projectId, apiKey, `students/${stId}`),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            name:           { stringValue: name.trim().slice(0, 50) },
            surname:        { stringValue: surname.trim().slice(0, 50) },
            class:          { stringValue: studentClass.trim().slice(0, 20) },
            parent_phone:   { stringValue: parentPhone ? parentPhone.trim().slice(0, 20) : '' },
            institution_id: { stringValue: institutionId.trim() },
            created_at:     { timestampValue: now },
          },
        }),
      }
    );

    if (!fsRes.ok) {
      const errBody = await fsRes.json();
      throw new Error(errBody.error?.message || 'Firestore yazma hatasi');
    }

    const newStudent = {
      id: stId,
      name: name.trim(),
      surname: surname.trim(),
      class: studentClass.trim(),
      parent_phone: parentPhone ? parentPhone.trim() : '',
      institution_id: institutionId.trim(),
      created_at: now,
      last_report_date: null,
      status: 'Rapor Yok',
    };

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
    const delRes = await fetch(
      fsUrl(projectId, apiKey, `students/${id}`),
      { method: 'DELETE' }
    );

    if (!delRes.ok && delRes.status !== 404) {
      const err = await delRes.json();
      throw new Error(err.error?.message || 'Firestore silme hatasi');
    }

    try {
      const reportDocs = await fetchAllDocs(projectId, apiKey, 'reports');
      const toDelete   = reportDocs.filter(d => d.fields?.student_id?.stringValue === id);
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

// ─── PUT (update phone) ───────────────────────────────────────────────────────
export async function PUT(req) {
  const { projectId, apiKey } = getFirestoreConfig();

  try {
    const { id, parentPhone } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'Ogrenci ID eksik.' }, { status: 400 });

    await fetch(
      fsUrl(projectId, apiKey, `students/${id}`, '&updateMask.fieldPaths=parent_phone'),
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { parent_phone: { stringValue: parentPhone || '' } } }),
      }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT STUDENT ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
