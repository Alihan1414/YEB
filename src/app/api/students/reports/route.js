import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const db = readDb();
  let reports = db.reports;
  if (studentId) {
    reports = reports.filter(r => r.student_id === studentId);
  }
  reports = reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return NextResponse.json({ success: true, reports });
}

export async function POST(req) {
  try {
    const { studentId, reportText, category, createdBy } = await req.json();
    if (!studentId || !reportText || !category) {
      return NextResponse.json({ success: false, error: 'Öğrenci ID, rapor metni ve kategori zorunludur.' }, { status: 400 });
    }
    const db = readDb();
    const student = db.students.find(s => s.id === studentId);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Öğrenci bulunamadı.' }, { status: 404 });
    }
    const newReport = {
      id: `report-${Date.now()}`,
      student_id: studentId,
      report_text: reportText,
      category,
      created_at: new Date().toISOString(),
      created_by: createdBy || 'Öğretmen'
    };
    db.reports.push(newReport);
    writeDb(db);
    return NextResponse.json({ success: true, report: newReport });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
