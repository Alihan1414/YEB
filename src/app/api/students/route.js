import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function GET() {
  const db = readDb();
  return NextResponse.json({ success: true, students: db.students });
}

export async function POST(req) {
  try {
    const { name, surname, className } = await req.json();
    if (!name || !surname || !className) {
      return NextResponse.json({ success: false, error: 'Ad, soyad ve sınıf zorunludur.' }, { status: 400 });
    }
    const db = readDb();
    const newStudent = {
      id: `student-${Date.now()}`,
      name,
      surname,
      class: className,
      created_at: new Date().toISOString()
    };
    db.students.push(newStudent);
    writeDb(db);
    return NextResponse.json({ success: true, student: newStudent });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
