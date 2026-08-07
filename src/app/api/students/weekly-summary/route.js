import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CATEGORY_SCORES = {
  Akademik: 3, Namaz: 2, Program: 2, Sağlık: 1, Yemek: 1, Diğer: 1,
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId') || 'yamanevler';

    let students = [];
    let reports = [];

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    // 1. Fetch Students & Reports
    if (projectId && apiKey) {
      try {
        const [sRes, rRes] = await Promise.all([
          fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}`,
            { cache: 'no-store' }
          ),
          fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports?key=${apiKey}`,
            { cache: 'no-store' }
          ),
        ]);

        const [sData, rData] = await Promise.all([sRes.json(), rRes.json()]);

        if (sData.documents) {
          students = sData.documents
            .filter(doc => {
              const f = doc.fields || {};
              return (f.institution_id?.stringValue || 'yamanevler') === institutionId;
            })
            .map(doc => {
              const fields = doc.fields || {};
              return {
                id: doc.name.split('/').pop(),
                name: fields.name?.stringValue || '',
                surname: fields.surname?.stringValue || '',
                class: fields.class?.stringValue || '',
              };
            });
        }

        if (rData.documents) {
          reports = rData.documents
            .filter(doc => {
              const f = doc.fields || {};
              return (f.institution_id?.stringValue || 'yamanevler') === institutionId;
            })
            .map(doc => {
              const fields = doc.fields || {};
              return {
                id: doc.name.split('/').pop(),
                student_id: fields.student_id?.stringValue || '',
                student_name: fields.student_name?.stringValue || '',
                class: fields.class?.stringValue || '',
                category: fields.category?.stringValue || 'Diğer',
                created_at: fields.created_at?.timestampValue || null,
                created_by: fields.created_by?.stringValue || 'Bilinmeyen Öğretmen',
              };
            });
        }
      } catch (err) {
        console.warn("Weekly Summary Firestore fetch failed, falling back to local database:", err);
      }
    }

    // Local DB Fallback
    if (students.length === 0 || reports.length === 0) {
      const dbData = readDb();
      if (students.length === 0) {
        students = (dbData.students || [])
          .filter(s => (s.institution_id || 'yamanevler') === institutionId);
      }
      if (reports.length === 0) {
        reports = (dbData.reports || [])
          .filter(r => (r.institution_id || 'yamanevler') === institutionId);
      }
    }

    // 2. Filter reports by last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyReports = reports.filter(r => {
      const d = r.created_at ? new Date(r.created_at) : null;
      return d && d >= weekAgo;
    });

    // 3. Perform calculations
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
    const classScores = {};
    const teacherPerformance = {};
    const studentScores = {};

    let weeklyNamazCount = 0;
    let weeklyAkademikCount = 0;

    weeklyReports.forEach(r => {
      const category = r.category || 'Diğer';
      const pts = CATEGORY_SCORES[category] || 1;

      // Class score calculation
      const st = studentMap[r.student_id];
      const cls = st?.class || r.class || 'Bilinmiyor';
      classScores[cls] = (classScores[cls] || 0) + pts;

      // Teacher performance calculation
      const teacher = r.created_by || 'Bilinmeyen Öğretmen';
      teacherPerformance[teacher] = (teacherPerformance[teacher] || 0) + 1;

      // Student score calculation
      if (r.student_id) {
        studentScores[r.student_id] = (studentScores[r.student_id] || 0) + pts;
      }

      // Namaz and Akademik counts
      if (category === 'Namaz') weeklyNamazCount++;
      if (category === 'Akademik') weeklyAkademikCount++;
    });

    // Sort classes by score
    const topClasses = Object.entries(classScores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);

    // Sort students by score to find top 3
    const topStudents = Object.entries(studentScores)
      .map(([id, score]) => {
        const st = studentMap[id];
        return {
          id,
          name: st ? `${st.name} ${st.surname}` : 'Bilinmeyen Öğrenci',
          class: st?.class || 'Bilinmiyor',
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      weeklyReportsCount: weeklyReports.length,
      weeklyNamazCount,
      weeklyAkademikCount,
      topClasses,
      topStudents,
      teacherPerformance,
    });

  } catch (error) {
    console.error("Weekly Summary API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
