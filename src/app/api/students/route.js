import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { name, surname, studentClass, parentEmail } = await req.json();

    if (!name || !surname || !studentClass) {
      return NextResponse.json({ success: false, error: 'Eksik bilgi.' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // Direct Firestore REST API insert - bypasses Firestore Client Security Rules
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students`,
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
      throw new Error(data.error.message);
    }

    return NextResponse.json({ success: true, id: data.name.split('/').pop() });
  } catch (err) {
    console.error('ADD STUDENT API ERROR:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
