import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function POST(req) {
  try {
    const { institutionId, deleteData } = await req.json();

    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Kurum ID zorunludur.' }, { status: 400 });
    }

    const dbData = readDb();

    // Remove institution from institutions array
    if (dbData.institutions) {
      dbData.institutions = dbData.institutions.filter(i => i.id !== institutionId);
    }

    // Always remove users belonging to this institution
    if (dbData.users) {
      dbData.users = dbData.users.filter(u => u.institutionId !== institutionId);
    }

    // Optionally delete all students, reports, leaves associated with institution
    if (deleteData) {
      if (dbData.students) {
        dbData.students = dbData.students.filter(s => s.institutionId !== institutionId);
      }
      if (dbData.reports) {
        dbData.reports = dbData.reports.filter(r => r.institutionId !== institutionId);
      }
      if (dbData.leaves) {
        dbData.leaves = dbData.leaves.filter(l => l.institutionId !== institutionId);
      }
    }

    writeDb(dbData);

    return NextResponse.json({
      success: true,
      message: `Kurum (${institutionId}) başarıyla sistemden kaldırıldı.`
    });

  } catch (error) {
    console.error("Delete institution API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
