import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getFirestoreConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY    || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
  return { projectId, apiKey };
}

function fsUrl(projectId, apiKey, path, extra = '') {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}?key=${apiKey}${extra}`;
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  const { projectId, apiKey } = getFirestoreConfig();
  const { searchParams } = new URL(req.url);
  const rawInstId  = searchParams.get('institutionId') || '';
  const normInstId = rawInstId.trim().toLowerCase();

  const groupsMap = new Map();

  // 1. Fetch from Firestore
  if (projectId && apiKey) {
    try {
      const res = await fetch(
        fsUrl(projectId, apiKey, 'teacher_groups', '&pageSize=300'),
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        (data.documents || []).forEach(doc => {
          const fields = doc.fields || {};
          const id = doc.name.split('/').pop();
          const rInst = (fields.institution_id?.stringValue || fields.institutionId?.stringValue || 'bolu-kilicaslan').trim().toLowerCase();
          
          if (!normInstId || rInst === normInstId) {
            const studentIds = (fields.student_ids?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
            const studentNames = (fields.student_names?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
            
            groupsMap.set(id, {
              id,
              name: fields.name?.stringValue || '',
              teacher_email: fields.teacher_email?.stringValue || '',
              teacher_name: fields.teacher_name?.stringValue || '',
              teacher_id: fields.teacher_id?.stringValue || '',
              student_ids: studentIds,
              student_names: studentNames,
              institution_id: rInst,
              created_at: fields.created_at?.timestampValue || fields.created_at?.stringValue || null,
            });
          }
        });
      }
    } catch (err) {
      console.warn('Firestore GET teacher_groups warn:', err.message);
    }
  }

  // 2. Supplement from Local DB
  try {
    const dbData = readDb();
    (dbData.teacher_groups || []).forEach(g => {
      const rInst = (g.institution_id || g.institutionId || 'bolu-kilicaslan').trim().toLowerCase();
      if (!normInstId || rInst === normInstId) {
        if (!groupsMap.has(g.id)) {
          groupsMap.set(g.id, g);
        }
      }
    });
  } catch (e) {}

  const groups = Array.from(groupsMap.values());
  groups.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));

  return NextResponse.json({ success: true, groups });
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  const { projectId, apiKey } = getFirestoreConfig();

  try {
    const body = await req.json();
    const {
      name,
      teacherEmail,
      teacherName,
      teacherId,
      studentIds = [],
      studentNames = [],
      institutionId = 'bolu-kilicaslan'
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Grup adı zorunludur.' }, { status: 400 });
    }

    const groupId = `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const cleanInstId = institutionId.trim().toLowerCase();

    const newGroup = {
      id: groupId,
      name: name.trim(),
      teacher_email: (teacherEmail || '').trim(),
      teacher_name: (teacherName || '').trim(),
      teacher_id: (teacherId || '').trim(),
      student_ids: studentIds,
      student_names: studentNames,
      institution_id: cleanInstId,
      created_at: nowIso,
    };

    // 1. Save to Local DB
    try {
      const dbData = readDb();
      dbData.teacher_groups = dbData.teacher_groups || [];
      dbData.teacher_groups = dbData.teacher_groups.filter(g => g.id !== groupId);
      dbData.teacher_groups.unshift(newGroup);
      writeDb(dbData);
    } catch (e) {
      console.warn('Local DB group save error:', e.message);
    }

    // 2. Save to Firestore
    if (projectId && apiKey) {
      try {
        await fetch(
          fsUrl(projectId, apiKey, `teacher_groups/${groupId}`),
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                name:           { stringValue: newGroup.name },
                teacher_email:  { stringValue: newGroup.teacher_email },
                teacher_name:   { stringValue: newGroup.teacher_name },
                teacher_id:     { stringValue: newGroup.teacher_id },
                student_ids:    { arrayValue: { values: studentIds.map(id => ({ stringValue: id })) } },
                student_names:  { arrayValue: { values: studentNames.map(n => ({ stringValue: n })) } },
                institution_id: { stringValue: cleanInstId },
                created_at:     { timestampValue: nowIso },
              },
            }),
          }
        );
      } catch (err) {
        console.warn('Firestore POST group warn:', err.message);
      }
    }

    return NextResponse.json({ success: true, group: newGroup });
  } catch (err) {
    console.error('POST TEACHER GROUP ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(req) {
  const { projectId, apiKey } = getFirestoreConfig();

  try {
    const body = await req.json();
    const { id, name, studentIds, studentNames } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Grup ID eksik.' }, { status: 400 });
    }

    // 1. Local DB
    try {
      const dbData = readDb();
      if (dbData.teacher_groups) {
        const idx = dbData.teacher_groups.findIndex(g => g.id === id);
        if (idx !== -1) {
          if (name !== undefined) dbData.teacher_groups[idx].name = name.trim();
          if (studentIds !== undefined) dbData.teacher_groups[idx].student_ids = studentIds;
          if (studentNames !== undefined) dbData.teacher_groups[idx].student_names = studentNames;
          writeDb(dbData);
        }
      }
    } catch (e) {
      console.warn('Local DB group PUT error:', e.message);
    }

    // 2. Firestore
    if (projectId && apiKey) {
      try {
        const updateFields = {};
        const fieldMasks = [];

        if (name !== undefined) {
          updateFields.name = { stringValue: name.trim() };
          fieldMasks.push('updateMask.fieldPaths=name');
        }
        if (studentIds !== undefined) {
          updateFields.student_ids = { arrayValue: { values: studentIds.map(sid => ({ stringValue: sid })) } };
          fieldMasks.push('updateMask.fieldPaths=student_ids');
        }
        if (studentNames !== undefined) {
          updateFields.student_names = { arrayValue: { values: studentNames.map(sn => ({ stringValue: sn })) } };
          fieldMasks.push('updateMask.fieldPaths=student_names');
        }

        if (fieldMasks.length > 0) {
          await fetch(
            fsUrl(projectId, apiKey, `teacher_groups/${id}`, `&${fieldMasks.join('&')}`),
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields: updateFields }),
            }
          );
        }
      } catch (err) {
        console.warn('Firestore PUT group warn:', err.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT TEACHER GROUP ERROR:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  const { projectId, apiKey } = getFirestoreConfig();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Grup ID eksik.' }, { status: 400 });
  }

  try {
    // 1. Local DB
    try {
      const dbData = readDb();
      if (dbData.teacher_groups) {
        dbData.teacher_groups = dbData.teacher_groups.filter(g => g.id !== id);
        writeDb(dbData);
      }
    } catch (e) {}

    // 2. Firestore
    if (projectId && apiKey) {
      try {
        await fetch(fsUrl(projectId, apiKey, `teacher_groups/${id}`), { method: 'DELETE' });
      } catch (e) {}
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
