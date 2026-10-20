import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';
import { getCached, setCached, invalidateCache } from '@/lib/serverCache';
import { listAllDocs, patchDoc, deleteDoc, S, ARR, readStr, readArr, docId } from '@/lib/firestoreRest';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

function docToGroup(doc) {
  const f = doc.fields || {};
  return {
    id: docId(doc),
    name: readStr(f, 'name'),
    section: readStr(f, 'section'),
    aliases: readArr(f, 'aliases'),
    order: f.order?.integerValue !== undefined ? Number(f.order.integerValue) : 999,
    teacher_email: readStr(f, 'teacher_email'),
    teacher_name: readStr(f, 'teacher_name'),
    teacher_id: readStr(f, 'teacher_id'),
    student_ids: readArr(f, 'student_ids'),
    student_names: readArr(f, 'student_names'),
    institution_id: normalizeInstitutionId(readStr(f, 'institution_id', 'institutionId') || 'bolu-kilicaslan'),
    created_at: readStr(f, 'created_at') || null,
  };
}

function sortGroups(groups) {
  return groups.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.name || '').localeCompare(b.name || '', 'tr'));
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawInstId = searchParams.get('institutionId') || '';
  const normInstId = rawInstId ? normalizeInstitutionId(rawInstId) : '';
  const instOk = (i) => !normInstId || isInstitutionMatch(i, normInstId);

  const cacheKey = `groups_${normInstId || 'all'}`;
  const cached = getCached(cacheKey, 8000);
  if (cached) return NextResponse.json({ success: true, groups: cached }, { headers: NO_STORE });

  let groups;
  let fromCloud = true;
  try {
    groups = (await listAllDocs('teacher_groups')).map(docToGroup).filter(g => instOk(g.institution_id));
  } catch (err) {
    console.error('Groups Firestore read failed:', err.message);
    fromCloud = false;
    groups = (readDb().teacher_groups || [])
      .map(g => ({ ...g, institution_id: normalizeInstitutionId(g.institution_id || g.institutionId || 'bolu-kilicaslan') }))
      .filter(g => instOk(g.institution_id));
  }

  sortGroups(groups);
  if (fromCloud) setCached(cacheKey, groups);
  return NextResponse.json({ success: true, groups }, { headers: NO_STORE });
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { name, teacherEmail, teacherName, teacherId, studentIds = [], studentNames = [], institutionId = 'bolu-kilicaslan' } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Grup adı zorunludur.' }, { status: 400 });
    }

    const newGroup = {
      id: `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      teacher_email: (teacherEmail || '').trim(),
      teacher_name: (teacherName || '').trim(),
      teacher_id: (teacherId || '').trim(),
      student_ids: studentIds,
      student_names: studentNames,
      institution_id: normalizeInstitutionId(institutionId),
      created_at: new Date().toISOString(),
    };

    try {
      await patchDoc(`teacher_groups/${newGroup.id}`, {
        name: S(newGroup.name),
        teacher_email: S(newGroup.teacher_email),
        teacher_name: S(newGroup.teacher_name),
        teacher_id: S(newGroup.teacher_id),
        student_ids: ARR(studentIds),
        student_names: ARR(studentNames),
        institution_id: S(newGroup.institution_id),
        created_at: { timestampValue: newGroup.created_at },
      });
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Grup buluta kaydedilemedi, tekrar deneyin.' }, { status: 503 });
    }

    try {
      const db = readDb();
      db.teacher_groups = [newGroup, ...(db.teacher_groups || []).filter(g => g.id !== newGroup.id)];
      writeDb(db);
    } catch (e) {}

    invalidateCache('groups');
    return NextResponse.json({ success: true, group: newGroup });
  } catch (err) {
    console.error('POST TEACHER GROUP ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(req) {
  try {
    const { id, name, studentIds, studentNames } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'Grup ID eksik.' }, { status: 400 });

    const fields = {};
    const mask = [];
    if (name !== undefined) { fields.name = S(name.trim()); mask.push('name'); }
    if (studentIds !== undefined) { fields.student_ids = ARR(studentIds); mask.push('student_ids'); }
    if (studentNames !== undefined) { fields.student_names = ARR(studentNames); mask.push('student_names'); }

    if (mask.length) {
      try {
        await patchDoc(`teacher_groups/${id}`, fields, mask);
      } catch (err) {
        return NextResponse.json({ success: false, error: 'Grup güncellenemedi, tekrar deneyin.' }, { status: 503 });
      }
    }

    try {
      const db = readDb();
      const g = (db.teacher_groups || []).find(x => x.id === id);
      if (g) {
        if (name !== undefined) g.name = name.trim();
        if (studentIds !== undefined) g.student_ids = studentIds;
        if (studentNames !== undefined) g.student_names = studentNames;
        writeDb(db);
      }
    } catch (e) {}

    invalidateCache('groups');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT TEACHER GROUP ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'Grup ID eksik.' }, { status: 400 });

  try {
    try {
      await deleteDoc(`teacher_groups/${id}`);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Grup silinemedi, tekrar deneyin.' }, { status: 503 });
    }
    try {
      const db = readDb();
      db.teacher_groups = (db.teacher_groups || []).filter(g => g.id !== id);
      writeDb(db);
    } catch (e) {}

    invalidateCache('groups');
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
