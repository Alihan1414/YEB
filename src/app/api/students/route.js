import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

// ─── Helpers ────────────────────────────────────────────────────────────────
function buildStatusAndDate(studentId, allReports) {
  const studentReports = allReports.filter(r => r.student_id === studentId);
  if (studentReports.length === 0) return { last_report_date: null, status: 'Rapor Yok' };
  studentReports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const last = studentReports[0];
  const c = (last.content || '').toLowerCase();
  let status = 'Orta';
  if (c.includes('gelmedi') || c.includes('kavga') || c.includes('hasta') || c.includes('dikkat') || c.includes('kötü') || c.includes('uyarı')) {
    status = 'Dikkat';
  } else if (c.includes('katıldı') || c.includes('iyi') || c.includes('başarılı') || c.includes('aktif') || c.includes('tebrik')) {
    status = 'İyi';
  }
  return { last_report_date: last.created_at, status };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    // institutionId defaults to 'yamanevler' for backward compatibility
    const institutionId = searchParams.get('institutionId') || 'yamanevler';

    const dbData = readDb();
    const allReports = dbData.reports || [];

    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (projectId && apiKey) {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}`,
        { cache: 'no-store' }
      );
      const data = await res.json();

      if (!data.error && data.documents) {
        let students = data.documents.map(doc => {
          const fields = doc.fields || {};
          const id = doc.name.split('/').pop();
          const info = buildStatusAndDate(id, allReports);
          return {
            id,
            name:           fields.name?.stringValue || '',
            surname:        fields.surname?.stringValue || '',
            class:          fields.class?.stringValue || '',
            parent_phone:   fields.parent_phone?.stringValue || '',
            institution_id: fields.institution_id?.stringValue || 'yamanevler',
            created_at:     fields.created_at?.timestampValue || null,
            last_report_date: info.last_report_date,
            status:         info.status,
          };
        });

        // Filter by institution
        students = students.filter(s => s.institution_id === institutionId);
        students.sort((a, b) => (a.surname || '').localeCompare(b.surname || '', 'tr'));
        return NextResponse.json({ success: true, students });
      }
    }

    // ── Local DB fallback ───────────────────────────────────────────────────
    const students = (dbData.students || [])
      .filter(s => (s.institution_id || 'yamanevler') === institutionId)
      .map(s => ({ ...s, ...buildStatusAndDate(s.id, allReports) }))
      .sort((a, b) => (a.surname || '').localeCompare(b.surname || '', 'tr'));

    return NextResponse.json({ success: true, students });
  } catch (err) {
    console.error('GET STUDENTS API ERROR:', err);
    const dbData = readDb();
    const students = (dbData.students || []).map(s => ({ ...s, last_report_date: null, status: 'Rapor Yok' }));
    return NextResponse.json({ success: true, students });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();

    // Check if bulk insert (array of students)
    if (body.students && Array.isArray(body.students)) {
      const { students, institutionId = 'yamanevler' } = body;
      const createdStudents = [];
      const dbData = readDb();
      dbData.students = dbData.students || [];

      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

      for (let i = 0; i < students.length; i++) {
        const item = students[i];
        if (!item.name || !item.surname || !item.studentClass) continue;

        const stId = `student-${Date.now()}-${i}-${Math.floor(Math.random()*1000)}`;
        const newSt = {
          id: stId,
          name: item.name.trim(),
          surname: item.surname.trim(),
          class: item.studentClass.trim(),
          parent_phone: item.parentPhone ? item.parentPhone.trim() : '',
          institution_id: institutionId,
          created_at: new Date().toISOString(),
        };

        if (projectId && apiKey) {
          try {
            await fetch(
              `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students/${stId}?key=${apiKey}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: {
                    name:           { stringValue: newSt.name },
                    surname:        { stringValue: newSt.surname },
                    class:          { stringValue: newSt.class },
                    parent_phone:   { stringValue: newSt.parent_phone },
                    institution_id: { stringValue: institutionId },
                    created_at:     { timestampValue: newSt.created_at },
                  },
                }),
              }
            );
          } catch (e) {
            console.warn("Firestore bulk student add error for item:", item, e.message);
          }
        }

        dbData.students.push(newSt);
        createdStudents.push(newSt);
      }

      writeDb(dbData);
      return NextResponse.json({ success: true, count: createdStudents.length, students: createdStudents });
    }

    // Single student creation
    const { name, surname, studentClass, parentPhone, institutionId = 'yamanevler' } = body;

    if (!name || !surname || !studentClass) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi.' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const stId = `student-${Date.now()}-${Math.floor(Math.random()*1000)}`;

    const newStudent = {
      id: stId,
      name: name.trim(),
      surname: surname.trim(),
      class: studentClass.trim(),
      parent_phone: parentPhone ? parentPhone.trim() : '',
      institution_id: institutionId,
      created_at: new Date().toISOString(),
    };

    if (projectId && apiKey) {
      try {
        await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students/${stId}?key=${apiKey}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                name:           { stringValue: newStudent.name },
                surname:        { stringValue: newStudent.surname },
                class:          { stringValue: newStudent.class },
                parent_phone:   { stringValue: newStudent.parent_phone },
                institution_id: { stringValue: institutionId },
                created_at:     { timestampValue: newStudent.created_at },
              },
            }),
          }
        );
      } catch (e) {
        console.warn("Firestore single student add error:", e.message);
      }
    }

    // Always sync with Local DB
    const dbData = readDb();
    dbData.students = dbData.students || [];
    // remove duplicate if exists
    dbData.students = dbData.students.filter(s => s.id !== stId);
    dbData.students.push(newStudent);
    writeDb(dbData);

    return NextResponse.json({ success: true, id: newStudent.id, student: newStudent });
  } catch (err) {
    console.error('ADD STUDENT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID parametresi eksik.' }, { status: 400 });

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (projectId && apiKey) {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students/${id}?key=${apiKey}`,
        { method: 'DELETE' }
      );
    }

    const dbData = readDb();
    if (dbData.students) dbData.students = dbData.students.filter(s => s.id !== id);
    if (dbData.reports)  dbData.reports  = dbData.reports.filter(r => r.student_id !== id);
    writeDb(dbData);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('DELETE STUDENT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(req) {
  try {
    const { id, parentPhone } = await req.json();
    if (!id) return NextResponse.json({ success: false, error: 'Öğrenci ID eksik.' }, { status: 400 });

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (projectId && apiKey) {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students/${id}?updateMask.fieldPaths=parent_phone&key=${apiKey}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { parent_phone: { stringValue: parentPhone || '' } } }),
        }
      );
    }

    const dbData = readDb();
    if (dbData.students) {
      dbData.students = dbData.students.map(s =>
        s.id === id ? { ...s, parent_phone: parentPhone || '' } : s
      );
    }
    writeDb(dbData);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT STUDENT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
