import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';

export const dynamic = 'force-dynamic';

const CATEGORY_SCORES = {
  Akademik: 3,
  'Girdi Çıktı': 2,
  Program: 2,
  Sağlık: 1,
  Saglik: 1,
  Yoklama: 1,
  'Dahili Ders': 1,
  // Eski veri uyumluluğu
  Namaz: 2,
  Yemek: 1,
  Dahili: 1,
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'bolu-kilicaslan';
    const normInstId = normalizeInstitutionId(rawInstId);

    let students = [];
    let reports = [];
    let teacherGroups = [];

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';

    // 1. Fetch Students, Reports and Groups from Firestore with 1.2s timeout
    if (projectId && apiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);

      try {
        const [sRes, rRes, gRes] = await Promise.all([
          fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?pageSize=300&key=${apiKey}`,
            { cache: 'no-store', signal: controller.signal }
          ),
          fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/reports?pageSize=1000&key=${apiKey}`,
            { cache: 'no-store', signal: controller.signal }
          ),
          fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/teacher_groups?pageSize=100&key=${apiKey}`,
            { cache: 'no-store', signal: controller.signal }
          ),
        ]);
        clearTimeout(timeout);

        if (sRes.ok && rRes.ok && gRes.ok) {
          const [sData, rData, gData] = await Promise.all([sRes.json(), rRes.json(), gRes.json()]);

          if (sData.documents) {
            students = sData.documents
              .filter(doc => {
                const f = doc.fields || {};
                const rInst = normalizeInstitutionId(f.institution_id?.stringValue || f.institutionId?.stringValue || 'bolu-kilicaslan');
                return normInstId === 'platform' || isInstitutionMatch(rInst, normInstId);
              })
              .map(doc => {
                const fields = doc.fields || {};
                return {
                  id: doc.name.split('/').pop(),
                  name: fields.name?.stringValue || '',
                  surname: fields.surname?.stringValue || '',
                  class: fields.class?.stringValue || '',
                  checkout_time: fields.checkout_time?.timestampValue || fields.checkout_time?.stringValue || null,
                };
              });
          }

          if (rData.documents) {
            reports = rData.documents
              .filter(doc => {
                const f = doc.fields || {};
                const rInst = normalizeInstitutionId(f.institution_id?.stringValue || f.institutionId?.stringValue || 'bolu-kilicaslan');
                return normInstId === 'platform' || isInstitutionMatch(rInst, normInstId);
              })
              .map(doc => {
                const fields = doc.fields || {};
                return {
                  id: doc.name.split('/').pop(),
                  student_id: fields.student_id?.stringValue || '',
                  student_name: fields.student_name?.stringValue || '',
                  class: fields.class?.stringValue || '',
                  category: fields.category?.stringValue || 'Dahili Ders',
                  isPositive: fields.isPositive?.booleanValue !== false,
                  content: fields.content?.stringValue || '',
                  created_at: fields.created_at?.timestampValue || fields.created_at?.stringValue || null,
                  created_by: fields.created_by?.stringValue || 'Bilinmeyen',
                };
              });
          }

          if (gData.documents) {
            teacherGroups = gData.documents
              .filter(doc => {
                const f = doc.fields || {};
                const rInst = normalizeInstitutionId(f.institution_id?.stringValue || f.institutionId?.stringValue || 'bolu-kilicaslan');
                return normInstId === 'platform' || isInstitutionMatch(rInst, normInstId);
              })
              .map(doc => {
                const fields = doc.fields || {};
                const sIds = (fields.student_ids?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
                return {
                  id: doc.name.split('/').pop(),
                  name: fields.name?.stringValue || '',
                  teacher_name: fields.teacher_name?.stringValue || '',
                  teacher_email: fields.teacher_email?.stringValue || '',
                  student_ids: sIds,
                };
              });
          }
        }
      } catch (err) {
        clearTimeout(timeout);
      }
    }

    // Supplement from Local DB if available
    try {
      const dbData = readDb();
      if ((!students || students.length === 0) && dbData.students) {
        students = dbData.students
          .filter(s => normInstId === 'platform' || isInstitutionMatch(s.institution_id || s.institutionId || 'bolu-kilicaslan', normInstId))
          .map(s => ({ id: s.id, name: s.name, surname: s.surname, class: s.class, checkout_time: s.checkout_time || null }));
      }
      if ((!reports || reports.length === 0) && dbData.reports) {
        reports = dbData.reports
          .filter(r => normInstId === 'platform' || isInstitutionMatch(r.institution_id || r.institutionId || 'bolu-kilicaslan', normInstId))
          .map(r => ({
            id: r.id,
            student_id: r.student_id || r.studentId,
            student_name: r.student_name || r.studentName,
            class: r.class || r.className,
            category: r.category || 'Dahili Ders',
            isPositive: r.isPositive !== false,
            content: r.content || '',
            created_at: r.created_at || null,
            created_by: r.created_by || r.createdBy || 'Bilinmeyen',
          }));
      }
      if ((!teacherGroups || teacherGroups.length === 0) && dbData.teacher_groups) {
        teacherGroups = dbData.teacher_groups
          .filter(g => normInstId === 'platform' || isInstitutionMatch(g.institution_id || g.institutionId || 'bolu-kilicaslan', normInstId))
          .map(g => ({
            id: g.id,
            name: g.name,
            teacher_name: g.teacher_name,
            teacher_email: g.teacher_email,
            student_ids: g.student_ids || [],
          }));
      }
    } catch (e) {}

    // 2. Filter reports by last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyReports = reports.filter(r => {
      const d = r.created_at ? new Date(r.created_at) : null;
      return d && d >= weekAgo;
    });

    // 3. Calculations
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
    
    // Class-level stats aggregation
    const classDataMap = {};
    const teacherPerformance = {};
    const studentStatsMap = {};

    const categoryCounts = {
      Akademik: 0,
      Yoklama: 0,
      Program: 0,
      Sağlık: 0,
      'Girdi Çıktı': 0,
      'Dahili Ders': 0,
    };

    const categoryBreakdown = {
      Akademik: { name: 'Akademik', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, studentScores: {} },
      Yoklama: { name: 'Yoklama', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, studentScores: {} },
      Program: { name: 'Program', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, studentScores: {} },
      Sağlık: { name: 'Sağlık', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, studentScores: {} },
      'Girdi Çıktı': { name: 'Girdi Çıktı', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, studentScores: {} },
      'Dahili Ders': { name: 'Dahili Ders', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, studentScores: {} },
    };

    let weeklyYoklamaCount = 0;
    let weeklyAkademikCount = 0;
    let weeklyDahiliCount = 0;
    let totalPositiveReports = 0;

    weeklyReports.forEach(r => {
      let category = r.category || 'Dahili Ders';
      if (category === 'Yemek') category = 'Yoklama';
      if (category === 'Namaz') category = 'Girdi Çıktı';
      if (category === 'Dahili') category = 'Dahili Ders';
      if (!categoryCounts.hasOwnProperty(category)) category = 'Dahili Ders';

      const basePts = CATEGORY_SCORES[category] || 1;
      const isPos = r.isPositive !== false;
      const pts = isPos ? basePts : -1;

      if (isPos) totalPositiveReports++;

      // Category counters
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      if (category === 'Yoklama') weeklyYoklamaCount++;
      if (category === 'Akademik') weeklyAkademikCount++;
      if (category === 'Dahili Ders') weeklyDahiliCount++;

      // Student mapping
      const st = studentMap[r.student_id];
      const cls = st?.class || r.class || 'Genel';
      const studentFullName = st ? `${st.name} ${st.surname}` : r.student_name || 'Öğrenci';

      // Category breakdown aggregation
      if (categoryBreakdown[category]) {
        categoryBreakdown[category].count += 1;
        if (isPos) categoryBreakdown[category].positiveCount += 1;
        else categoryBreakdown[category].negativeCount += 1;
        categoryBreakdown[category].classDist[cls] = (categoryBreakdown[category].classDist[cls] || 0) + 1;
        categoryBreakdown[category].studentScores[studentFullName] = (categoryBreakdown[category].studentScores[studentFullName] || 0) + pts;
        categoryBreakdown[category].reports.push({
          id: r.id,
          studentName: studentFullName,
          studentId: r.student_id,
          className: cls,
          content: r.content,
          isPositive: isPos,
          createdAt: r.created_at,
          createdBy: r.created_by,
          points: pts,
        });
      }

      // Class aggregation
      if (!classDataMap[cls]) {
        classDataMap[cls] = {
          name: cls,
          score: 0,
          reportCount: 0,
          positiveCount: 0,
          negativeCount: 0,
          dahiliCount: 0,
          categories: {},
          studentScores: {},
        };
      }
      classDataMap[cls].score += pts;
      classDataMap[cls].reportCount += 1;
      if (isPos) classDataMap[cls].positiveCount += 1;
      else classDataMap[cls].negativeCount += 1;
      if (category === 'Dahili Ders') classDataMap[cls].dahiliCount += 1;
      classDataMap[cls].categories[category] = (classDataMap[cls].categories[category] || 0) + 1;

      // Student-level aggregation
      if (r.student_id) {
        if (!studentStatsMap[r.student_id]) {
          studentStatsMap[r.student_id] = {
            id: r.student_id,
            name: studentFullName,
            class: cls,
            score: 0,
            reportCount: 0,
            positiveCount: 0,
            negativeCount: 0,
            dahiliCount: 0,
            lastNegativeNote: '',
            categories: {},
          };
        }
        studentStatsMap[r.student_id].score += pts;
        studentStatsMap[r.student_id].reportCount += 1;
        if (isPos) {
          studentStatsMap[r.student_id].positiveCount += 1;
        } else {
          studentStatsMap[r.student_id].negativeCount += 1;
          studentStatsMap[r.student_id].lastNegativeNote = r.content || 'Olumsuz davranış / gecikme kaydı';
        }
        if (category === 'Dahili Ders') studentStatsMap[r.student_id].dahiliCount += 1;
        studentStatsMap[r.student_id].categories[category] = (studentStatsMap[r.student_id].categories[category] || 0) + 1;

        classDataMap[cls].studentScores[r.student_id] = (classDataMap[cls].studentScores[r.student_id] || 0) + pts;
      }

      // Teacher performance
      const teacher = r.created_by || 'Bilinmeyen';
      teacherPerformance[teacher] = (teacherPerformance[teacher] || 0) + 1;
    });

    // Sort category reports newest first
    Object.keys(categoryBreakdown).forEach(cat => {
      categoryBreakdown[cat].reports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const total = categoryBreakdown[cat].count;
      categoryBreakdown[cat].efficiencyRate = total > 0 ? Math.round((categoryBreakdown[cat].positiveCount / total) * 100) : 100;
    });

    // Top Classes Formatting
    const topClasses = Object.values(classDataMap).map(c => {
      const eff = c.reportCount > 0 ? Math.round((c.positiveCount / c.reportCount) * 100) : 100;
      const dahiliRate = c.reportCount > 0 ? Math.round((c.dahiliCount / c.reportCount) * 100) : 0;
      return {
        name: c.name,
        score: c.score,
        reportCount: c.reportCount,
        positiveCount: c.positiveCount,
        negativeCount: c.negativeCount,
        efficiencyRate: eff,
        dahiliCount: c.dahiliCount,
        dahiliParticipationRate: dahiliRate,
        categories: c.categories,
      };
    }).sort((a, b) => b.score - a.score);

    // Group-level Aggregation (Öğretmen Grupları: Aslanlar vb.)
    const topGroups = teacherGroups.map(grp => {
      const memberIds = new Set(grp.student_ids || []);
      let grpScore = 0;
      let grpReports = 0;
      let grpPos = 0;
      let grpNeg = 0;
      let grpDahili = 0;
      const memberList = [];

      memberIds.forEach(stId => {
        const st = studentMap[stId];
        const stStat = studentStatsMap[stId];
        const sc = stStat ? stStat.score : 0;
        const repCount = stStat ? stStat.reportCount : 0;
        const dahCount = stStat ? stStat.dahiliCount : 0;

        memberList.push({
          id: stId,
          name: st ? `${st.name} ${st.surname}` : 'Öğrenci',
          class: st?.class || 'Genel',
          score: sc,
          reportCount: repCount,
          dahiliCount: dahCount,
        });

        if (stStat) {
          grpScore += stStat.score;
          grpReports += stStat.reportCount;
          grpPos += stStat.positiveCount;
          grpNeg += stStat.negativeCount;
          grpDahili += stStat.dahiliCount;
        }
      });

      memberList.sort((a, b) => b.score - a.score);

      const eff = grpReports > 0 ? Math.round((grpPos / grpReports) * 100) : 100;
      const dahiliRate = grpReports > 0 ? Math.round((grpDahili / grpReports) * 100) : 0;

      return {
        id: grp.id,
        name: grp.name,
        teacherName: grp.teacher_name || 'Öğretmen',
        teacherEmail: grp.teacher_email || '',
        studentCount: memberIds.size,
        score: grpScore,
        reportCount: grpReports,
        positiveCount: grpPos,
        negativeCount: grpNeg,
        efficiencyRate: eff,
        dahiliCount: grpDahili,
        dahiliParticipationRate: dahiliRate,
        members: memberList,
      };
    }).sort((a, b) => b.score - a.score);

    // AYRIŞTIRMA: Sadece POZİTİF gelişim gösteren (score > 0) talebeleri en başarılı olarak sırala!
    const allStudentStats = Object.values(studentStatsMap);

    const topStudents = allStudentStats
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    // AYRIŞTIRMA: Olumsuz davranış veya eksi puanı olanları destek/rehberlik listesine al!
    const studentsNeedingSupport = allStudentStats
      .filter(s => s.negativeCount > 0 || s.score < 0)
      .sort((a, b) => a.score - b.score) // en düşük puanlılar en başta
      .slice(0, 15);

    const overallEfficiency = weeklyReports.length > 0 
      ? Math.round((totalPositiveReports / weeklyReports.length) * 100) 
      : 100;

    // Checkouts overview
    const checkedOutStudents = students.filter(s => s.checkout_time);

    return NextResponse.json({
      success: true,
      totalStudentsCount: students.length,
      checkedOutCount: checkedOutStudents.length,
      insideCount: students.length - checkedOutStudents.length,
      weeklyReportsCount: weeklyReports.length,
      weeklyYoklamaCount,
      weeklyAkademikCount,
      weeklyDahiliCount,
      overallEfficiency,
      categoryCounts,
      categoryBreakdown,
      topClasses,
      topGroups,
      topStudents,
      studentsNeedingSupport,
      teacherPerformance,
      // Backward compatibility fields
      weeklyNamazCount: weeklyYoklamaCount,
    });

  } catch (error) {
    console.error('Weekly Summary API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}