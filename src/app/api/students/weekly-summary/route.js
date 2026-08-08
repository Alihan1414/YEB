import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CATEGORY_SCORES = {
  Akademik: 3, Namaz: 2, Program: 2, Saglik: 1, Yemek: 1, Diger: 1,
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get('institutionId') || 'yamanevler';
    const normInstId = institutionId.trim().toLowerCase();

    let students = [];
    let reports = [];

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    // 1. Fetch Students & Reports from Firestore
    if (projectId && apiKey) {
      try {
        const [sRes, rRes] = await Promise.all([
          fetch(
            https://firestore.googleapis.com/v1/projects//databases/(default)/documents/students?pageSize=300&key=,
            { cache: 'no-store' }
          ),
          fetch(
            https://firestore.googleapis.com/v1/projects//databases/(default)/documents/reports?pageSize=300&key=,
            { cache: 'no-store' }
          ),
        ]);

        const [sData, rData] = await Promise.all([sRes.json(), rRes.json()]);

        if (sData.documents) {
          students = sData.documents
            .filter(doc => {
              const f = doc.fields || {};
              return (f.institution_id?.stringValue || 'yamanevler').trim().toLowerCase() === normInstId;
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
              return (f.institution_id?.stringValue || 'yamanevler').trim().toLowerCase() === normInstId;
            })
            .map(doc => {
              const fields = doc.fields || {};
              return {
                id: doc.name.split('/').pop(),
                student_id: fields.student_id?.stringValue || '',
                student_name: fields.student_name?.stringValue || '',
                class: fields.class?.stringValue || '',
                category: fields.category?.stringValue || 'Diger',
                created_at: fields.created_at?.timestampValue || fields.created_at?.stringValue || null,
                created_by: fields.created_by?.stringValue || 'Bilinmeyen',
              };
            });
        }
      } catch (err) {
        console.warn('Weekly Summary Firestore fetch failed:', err.message);
      }
    }

    // 2. Filter reports by last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyReports = reports.filter(r => {
      const d = r.created_at ? new Date(r.created_at) : null;
      return d && d >= weekAgo;
    });

    // 3. Calculations
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
    const classScores = {};
    const teacherPerformance = {};
    const studentScores = {};

    let weeklyNamazCount = 0;
    let weeklyAkademikCount = 0;

    weeklyReports.forEach(r => {
      const category = r.category || 'Diger';
      const pts = CATEGORY_SCORES[category] || 1;

      const st = studentMap[r.student_id];
      const cls = st?.class || r.class || 'Bilinmiyor';
      classScores[cls] = (classScores[cls] || 0) + pts;

      const teacher = r.created_by || 'Bilinmeyen';
      teacherPerformance[teacher] = (teacherPerformance[teacher] || 0) + 1;

      if (r.student_id) {
        studentScores[r.student_id] = (studentScores[r.student_id] || 0) + pts;
      }

      if (category === 'Namaz') weeklyNamazCount++;
      if (category === 'Akademik') weeklyAkademikCount++;
    });

    const topClasses = Object.entries(classScores)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);

    const topStudents = Object.entries(studentScores)
      .map(([id, score]) => {
        const st = studentMap[id];
        return {
          id,
          name: st ? ${st.name}  : 'Bilinmeyen',
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
    console.error('Weekly Summary API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}