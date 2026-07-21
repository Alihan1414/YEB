import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Use Firestore REST API with structuredQuery or fallback to documents listing
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}`,
      { cache: 'no-store' }
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ success: true, students: [] });
    }

    const students = (data.documents || []).map(doc => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();
      return {
        id,
        name: fields.name?.stringValue || '',
        surname: fields.surname?.stringValue || '',
        class: fields.class?.stringValue || '',
        parent_email: fields.parent_email?.stringValue || '',
        created_at: fields.created_at?.timestampValue || null,
      };
    });

    students.sort((a, b) => a.surname.localeCompare(b.surname, 'tr'));
    return NextResponse.json({ success: true, students });
  } catch (err) {
    console.error('GET STUDENTS API ERROR:', err);
    return NextResponse.json({ success: true, students: [] });
  }
}

export async function POST(req) {
  try {
    const { name, surname, studentClass, parentEmail } = await req.json();

    if (!name || !surname || !studentClass) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi.' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    // Direct write via Firestore REST API passing key param
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            name: { stringValue: name },
            surname: { stringValue: surname },
            class: { stringValue: studentClass },
            parent_email: { stringValue: parentEmail || '' },
            created_at: { timestampValue: new Date().toISOString() },
          },
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      // If REST API fails with database error, return a friendly error response
      throw new Error(data.error.message);
    }

    return NextResponse.json({ success: true, id: data.name.split('/').pop() });
  } catch (err) {
    console.error('ADD STUDENT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
