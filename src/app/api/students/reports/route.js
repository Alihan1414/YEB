import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId     = searchParams.get('studentId');
    const institutionId = searchParams.get('institutionId') || 'yamanevler';

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (projectId && apiKey) {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports?key=${apiKey}`,
        { cache: 'no-store' }
      );
      const data = await res.json();

      if (!data.error && data.documents) {
        let reports = data.documents.map(doc => {
          const fields = doc.fields || {};
          const id = doc.name.split('/').pop();
          return {
            id,
            student_id:     fields.student_id?.stringValue || '',
            student_name:   fields.student_name?.stringValue || '',
            class:          fields.class?.stringValue || '',
            parent_phone:   fields.parent_phone?.stringValue || fields.parent_email?.stringValue || '',
            content:        fields.content?.stringValue || '',
            category:       fields.category?.stringValue || 'Diğer',
            notified:       fields.notified?.booleanValue || false,
            institution_id: fields.institution_id?.stringValue || 'yamanevler',
            created_at:     fields.created_at?.timestampValue || null,
          };
        });

        // Filter by institution
        reports = reports.filter(r => (r.institution_id || 'yamanevler') === institutionId);
        if (studentId) reports = reports.filter(r => r.student_id === studentId);

        reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        return NextResponse.json({ success: true, reports });
      }
    }
  } catch (err) {
    console.error('GET REPORTS API ERROR:', err);
  }

  // ── Local DB fallback ──────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const studentId     = searchParams.get('studentId');
  const institutionId = searchParams.get('institutionId') || 'yamanevler';
  const dbData = readDb();
  let reports = (dbData.reports || [])
    .filter(r => (r.institution_id || 'yamanevler') === institutionId);
  if (studentId) reports = reports.filter(r => r.student_id === studentId);
  reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return NextResponse.json({ success: true, reports });
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const {
      studentId, studentName, className, parentPhone,
      content, category, notifyParent, institutionId = 'yamanevler'
    } = await req.json();

    if (!studentId || !content) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi.' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (projectId && apiKey) {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports?key=${apiKey}`,
        {
          method: 'POST',
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
              institution_id: { stringValue: institutionId },
              created_at:     { timestampValue: new Date().toISOString() },
            },
          }),
        }
      );
      const data = await res.json();
      if (!data.error && data.name) {
        return NextResponse.json({ success: true, id: data.name.split('/').pop() });
      }
    }

    // Local DB fallback
    const dbData = readDb();
    const newReport = {
      id: `report-${Date.now()}`,
      student_id:     studentId,
      student_name:   studentName || '',
      class:          className || '',
      parent_phone:   parentPhone || '',
      content,
      category:       category || 'Diğer',
      notified:       !!notifyParent,
      institution_id: institutionId,
      created_at:     new Date().toISOString(),
    };
    dbData.reports = dbData.reports || [];
    dbData.reports.push(newReport);
    writeDb(dbData);

    return NextResponse.json({ success: true, id: newReport.id, report: newReport });
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

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (projectId && apiKey) {
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports/${id}?key=${apiKey}`,
        { method: 'DELETE' }
      );
    }

    const dbData = readDb();
    if (dbData.reports) dbData.reports = dbData.reports.filter(r => r.id !== id);
    writeDb(dbData);

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
    }
    writeDb(dbData);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
