import { NextResponse } from 'next/server';

// GET: Fetch reports for a student or all reports
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports`,
      { cache: 'no-store' }
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ success: true, reports: [] });
    }

    let reports = (data.documents || []).map(doc => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();
      return {
        id,
        student_id: fields.student_id?.stringValue || '',
        student_name: fields.student_name?.stringValue || '',
        class: fields.class?.stringValue || '',
        parent_email: fields.parent_email?.stringValue || '',
        content: fields.content?.stringValue || '',
        category: fields.category?.stringValue || 'Diğer',
        notified: fields.notified?.booleanValue || false,
        created_at: fields.created_at?.timestampValue || null,
      };
    });

    if (studentId) {
      reports = reports.filter(r => r.student_id === studentId);
    }

    // Sort by created_at desc
    reports.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    return NextResponse.json({ success: true, reports });
  } catch (err) {
    console.error('GET REPORTS API ERROR:', err);
    return NextResponse.json({ success: true, reports: [] });
  }
}

// POST: Add new report
export async function POST(req) {
  try {
    const { studentId, studentName, className, parentEmail, content, category, notifyParent } = await req.json();

    if (!studentId || !content) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi.' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            student_id: { stringValue: studentId },
            student_name: { stringValue: studentName || '' },
            class: { stringValue: className || '' },
            parent_email: { stringValue: parentEmail || '' },
            content: { stringValue: content },
            category: { stringValue: category || 'Diğer' },
            notified: { booleanValue: !!notifyParent },
            created_at: { timestampValue: new Date().toISOString() },
          },
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return NextResponse.json({ success: true, id: data.name.split('/').pop() });
  } catch (err) {
    console.error('ADD REPORT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
