import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';
import { getCached, setCached, invalidateCache } from '@/lib/serverCache';
import { listAllDocs, getDoc, patchDoc, deleteDoc, S, ARR, readStr, docId } from '@/lib/firestoreRest';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function docToStudent(doc) {
  const f = doc.fields || {};
  return {
    id: docId(doc),
    name: readStr(f, 'name'),
    surname: readStr(f, 'surname'),
    class: readStr(f, 'class'),
    parent_phone: readStr(f, 'parent_phone'),
    institution_id: normalizeInstitutionId(readStr(f, 'institution_id', 'institutionId')),
    created_at: readStr(f, 'created_at') || null,
    checkout_time: readStr(f, 'checkout_time') || null,
  };
}

// ─── Status helper ───────────────────────────────────────────────────────────
function buildStatus(reports) {
  if (!reports || reports.length === 0) return { last_report_date: null, status: 'Rapor Yok', report_count: 0 };
  reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const latest = reports[0];
  const c = (latest.content || '').toLowerCase();
  let status = 'Orta';
  if (latest.isPositive === false || /gelmedi|kavga|hasta|dikkat|uyari|uyarı|uyudu|kaynatti|kaynattı|inmedi/.test(c)) status = 'Dikkat';
  else if (latest.isPositive === true || /katildi|katıldı|iyi|basarili|başarılı|aktif|tebrik|tam/.test(c)) status = 'İyi';
  return { last_report_date: latest.created_at, status, report_count: reports.length };
}

async function getDeletedSet() {
  const set = new Set(readDb().deleted_students || []);
  try {
    const d = await getDoc('system_metadata/deleted_students');
    (d?.fields?.ids?.arrayValue?.values || []).forEach(v => v.stringValue && set.add(v.stringValue));
  } catch (e) {}
  return set;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawInstId = searchParams.get('institutionId') || '';
  const normInstId = rawInstId ? normalizeInstitutionId(rawInstId) : '';
  const instOk = (i) => !normInstId || normInstId === 'platform' || isInstitutionMatch(i || 'bolu-kilicaslan', normInstId);

  const cacheKey = `students_${normInstId || 'all'}`;
  const cached = getCached(cacheKey, 5000);
  if (cached) return NextResponse.json({ success: true, students: cached }, { headers: NO_STORE });

  const deletedSet = await getDeletedSet();
  let students = [];
  const reportsByStudent = {};
  let fromCloud = true;

  try {
    const [studentDocs, reportDocs] = await Promise.all([listAllDocs('students'), listAllDocs('reports')]);
    students = studentDocs.map(docToStudent).filter(s => !deletedSet.has(s.id) && instOk(s.institution_id));
    reportDocs.forEach(doc => {
      const f = doc.fields || {};
      const ri = normalizeInstitutionId(readStr(f, 'institution_id', 'institutionId'));
      if (!instOk(ri)) return;
      const si = readStr(f, 'student_id', 'studentId').trim();
      (reportsByStudent[si] = reportsByStudent[si] || []).push({
        content: readStr(f, 'content'),
        created_at: readStr(f, 'created_at') || null,
        isPositive: f.isPositive?.booleanValue,
      });
    });
  } catch (err) {
    // Bulut erişilemezse yerel yedek (önbelleğe alınmaz)
    console.error('Students Firestore read failed:', err.message);
    fromCloud = false;
    const db = readDb();
    students = (db.students || [])
      .filter(s => !deletedSet.has(s.id) && instOk(s.institution_id || s.institutionId))
      .map(s => ({
        id: s.id, name: s.name || '', surname: s.surname || '', class: s.class || '',
        parent_phone: s.parent_phone || '',
        institution_id: normalizeInstitutionId(s.institution_id || s.institutionId || 'bolu-kilicaslan'),
        created_at: s.created_at || null, checkout_time: s.checkout_time || null,
      }));
    (db.reports || []).forEach(r => {
      const si = (r.student_id || r.studentId || '').trim();
      (reportsByStudent[si] = reportsByStudent[si] || []).push(r);
    });
  }

  students = students.map(s => ({ ...s, ...buildStatus(reportsByStudent[s.id] || []) }));
  students.sort((a, b) => (a.surname || '').localeCompare(b.surname || '', 'tr'));
  if (fromCloud) setCached(cacheKey, students);
  return NextResponse.json({ success: true, students }, { headers: NO_STORE });
}

function invalidateAll() {
  invalidateCache('students');
  invalidateCache('weekly_summary');
  invalidateCache('dashboard');
}

function studentFields(st) {
  return {
    name: S(st.name.slice(0, 100)),
    surname: S(st.surname.slice(0, 100)),
    class: S(st.class.slice(0, 100)),
    parent_phone: S((st.parent_phone || '').slice(0, 30)),
    institution_id: S(st.institution_id),
    created_at: { timestampValue: st.created_at },
  };
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();

    // Toplu ekleme
    if (Array.isArray(body.students)) {
      const instId = normalizeInstitutionId(body.institutionId || 'bolu-kilicaslan');
      const created = [];
      const failed = [];
      for (let i = 0; i < body.students.length; i++) {
        const item = body.students[i];
        if (!item) continue;
        const st = {
          id: `student-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
          name: (item.name || '').trim(),
          surname: (item.surname || '').trim(),
          class: (item.studentClass || '').trim(),
          parent_phone: (item.parentPhone || '').trim(),
          institution_id: instId,
          created_at: new Date().toISOString(),
        };
        if (!st.name || !st.surname || !st.class) continue;
        try {
          await patchDoc(`students/${st.id}`, studentFields(st));
          created.push(st);
        } catch (e) {
          failed.push(`${st.name} ${st.surname}`);
        }
      }
      try {
        const db = readDb();
        db.students = [...created, ...(db.students || [])];
        writeDb(db);
      } catch (e) {}
      invalidateAll();
      return NextResponse.json({ success: failed.length === 0, count: created.length, students: created, failed,
        error: failed.length ? `${failed.length} öğrenci kaydedilemedi: ${failed.join(', ')}` : undefined });
    }

    const { name, surname, studentClass, parentPhone, institutionId = 'bolu-kilicaslan' } = body;
    if (!name || !surname || !studentClass) {
      return NextResponse.json({ success: false, error: 'Ad, Soyad ve Sınıf zorunludur.' }, { status: 400 });
    }

    const newStudent = {
      id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      surname: surname.trim(),
      class: studentClass.trim(),
      parent_phone: parentPhone ? parentPhone.trim() : '',
      institution_id: normalizeInstitutionId(institutionId),
      created_at: new Date().toISOString(),
      last_report_date: null,
      status: 'Rapor Yok',
    };

    try {
      await patchDoc(`students/${newStudent.id}`, studentFields(newStudent));
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Öğrenci buluta kaydedilemedi, tekrar deneyin.' }, { status: 503 });
    }

    try {
      const db = readDb();
      db.students = [newStudent, ...(db.students || [])];
      writeDb(db);
    } catch (e) {}

    invalidateAll();
    return NextResponse.json({ success: true, id: newStudent.id, student: newStudent });
  } catch (err) {
    console.error('POST STUDENT ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'ID parametresi eksik.' }, { status: 400 });

  try {
    try {
      await deleteDoc(`students/${id}`);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Öğrenci silinemedi, tekrar deneyin.' }, { status: 503 });
    }

    // Kalıcı silinenler listesi (eski yedeklerden geri dirilmesin)
    try {
      const d = await getDoc('system_metadata/deleted_students');
      const ids = new Set((d?.fields?.ids?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean));
      ids.add(id);
      await patchDoc('system_metadata/deleted_students', { ids: ARR([...ids]) });
    } catch (e) {
      console.warn('deleted_students sync error:', e.message);
    }

    // Öğrencinin raporlarını temizle
    try {
      const reportDocs = await listAllDocs('reports');
      const mine = reportDocs.filter(d => readStr(d.fields, 'student_id', 'studentId').trim() === id);
      await Promise.all(mine.map(d => deleteDoc(`reports/${docId(d)}`).catch(() => {})));
    } catch (e) {}

    // Gruplardan çıkar
    try {
      const groupDocs = await listAllDocs('teacher_groups');
      await Promise.all(groupDocs.map(g => {
        const f = g.fields || {};
        const ids = (f.student_ids?.arrayValue?.values || []).map(v => v.stringValue);
        const idx = ids.indexOf(id);
        if (idx === -1) return null;
        const names = (f.student_names?.arrayValue?.values || []).map(v => v.stringValue);
        ids.splice(idx, 1);
        if (names.length > idx) names.splice(idx, 1);
        return patchDoc(`teacher_groups/${docId(g)}`, { student_ids: ARR(ids), student_names: ARR(names) }, ['student_ids', 'student_names']).catch(() => {});
      }));
    } catch (e) {}

    try {
      const db = readDb();
      db.students = (db.students || []).filter(s => s.id !== id);
      db.reports = (db.reports || []).filter(r => r.student_id !== id && r.studentId !== id);
      db.deleted_students = Array.from(new Set([...(db.deleted_students || []), id]));
      writeDb(db);
    } catch (e) {}

    invalidateAll();
    invalidateCache('reports');
    invalidateCache('groups');
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('DELETE STUDENT ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT (veli telefonu / çıkış saati) ───────────────────────────────────────
export async function PUT(req) {
  try {
    const { id, parentPhone, checkout_time } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'Öğrenci ID eksik.' }, { status: 400 });

    const fields = {};
    const mask = [];
    if (parentPhone !== undefined) { fields.parent_phone = S(parentPhone || ''); mask.push('parent_phone'); }
    if (checkout_time !== undefined) { fields.checkout_time = S(checkout_time || ''); mask.push('checkout_time'); }

    if (mask.length) {
      try {
        await patchDoc(`students/${id}`, fields, mask);
      } catch (err) {
        return NextResponse.json({ success: false, error: 'Güncellenemedi, tekrar deneyin.' }, { status: 503 });
      }
    }

    try {
      const db = readDb();
      const st = (db.students || []).find(s => s.id === id);
      if (st) {
        if (parentPhone !== undefined) st.parent_phone = parentPhone || '';
        if (checkout_time !== undefined) st.checkout_time = checkout_time || null;
        writeDb(db);
      }
    } catch (e) {}

    invalidateCache('students');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT STUDENT ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
