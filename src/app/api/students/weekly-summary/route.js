import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';
import { getCached, setCached } from '@/lib/serverCache';
import { listAllDocs, readStr, readArr, docId } from '@/lib/firestoreRest';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

const CATEGORY_SCORES = {
  Akademik: 3,
  'Girdi Çıktı': 2,
  Program: 2,
  Sağlık: 1,
  Saglik: 1,
  Yoklama: 1,
  'Dahili Ders': 1,
  Namaz: 2,
  Yemek: 1,
  Dahili: 1,
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rawInstId = searchParams.get('institutionId') || 'bolu-kilicaslan';
    const normInstId = normalizeInstitutionId(rawInstId);
    const instOk = (i) => normInstId === 'platform' || isInstitutionMatch(i || 'bolu-kilicaslan', normInstId);

    // Gün parametresi (varsayılan son 7 gün)
    const days = parseInt(searchParams.get('days') || '7', 10);

    const cacheKey = `weekly_summary_${normInstId}_${days}`;
    const cachedData = getCached(cacheKey, 10000); // 10 saniye kısa önbellek (anında güncellik için)
    if (cachedData) {
      return NextResponse.json(cachedData, { headers: NO_STORE });
    }

    let students = [];
    let reports = [];
    let teacherGroups = [];

    // 1. Firestore Bulut Veritabanından Kesintisiz Oku
    try {
      const [sDocs, rDocs, gDocs] = await Promise.all([
        listAllDocs('students'),
        listAllDocs('reports'),
        listAllDocs('teacher_groups')
      ]);

      students = sDocs
        .filter(d => instOk(readStr(d.fields, 'institution_id', 'institutionId')))
        .map(d => ({
          id: docId(d),
          name: readStr(d.fields, 'name'),
          surname: readStr(d.fields, 'surname'),
          class: readStr(d.fields, 'class'),
          checkout_time: readStr(d.fields, 'checkout_time') || null,
        }));

      reports = rDocs
        .filter(d => instOk(readStr(d.fields, 'institution_id', 'institutionId')))
        .map(d => {
          const f = d.fields || {};
          return {
            id: docId(d),
            student_id: readStr(f, 'student_id', 'studentId').trim(),
            student_name: readStr(f, 'student_name', 'studentName'),
            class: readStr(f, 'class'),
            category: readStr(f, 'category') || 'Dahili Ders',
            isPositive: f.isPositive?.booleanValue !== false,
            content: readStr(f, 'content'),
            created_at: readStr(f, 'created_at') || null,
            created_by: readStr(f, 'created_by') || 'Bilinmeyen',
          };
        });

      teacherGroups = gDocs
        .filter(d => instOk(readStr(d.fields, 'institution_id', 'institutionId')))
        .map(d => ({
          id: docId(d),
          name: readStr(d.fields, 'name'),
          section: readStr(d.fields, 'section'),
          teacher_name: readStr(d.fields, 'teacher_name'),
          teacher_email: readStr(d.fields, 'teacher_email'),
          student_ids: readArr(d.fields, 'student_ids'),
          order: d.fields?.order?.integerValue ? Number(d.fields.order.integerValue) : 99,
        }));
    } catch (err) {
      console.warn('Firestore weekly-summary read warn, fallback to local:', err.message);
      const dbData = readDb();
      students = (dbData.students || [])
        .filter(s => instOk(s.institution_id || s.institutionId))
        .map(s => ({ id: s.id, name: s.name, surname: s.surname, class: s.class, checkout_time: s.checkout_time || null }));

      reports = (dbData.reports || [])
        .filter(r => instOk(r.institution_id || r.institutionId))
        .map(r => ({
          id: r.id,
          student_id: (r.student_id || r.studentId || '').trim(),
          student_name: r.student_name || r.studentName,
          class: r.class || r.className,
          category: r.category || 'Dahili Ders',
          isPositive: r.isPositive !== false,
          content: r.content || '',
          created_at: r.created_at || null,
          created_by: r.created_by || r.createdBy || 'Bilinmeyen',
        }));

      teacherGroups = (dbData.teacher_groups || [])
        .filter(g => instOk(g.institution_id || g.institutionId))
        .map((g, i) => ({
          id: g.id,
          name: g.name,
          section: g.section,
          teacher_name: g.teacher_name,
          teacher_email: g.teacher_email,
          student_ids: g.student_ids || [],
          order: g.order ?? i + 1,
        }));
    }

    // Grupları sırala (Çetinkaya, Aldemir, Mısırlı, Güney, Çetinkaya, Yerlikaya, Kalkan, Zauzı, Kaşıtoğlu)
    teacherGroups.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || (a.name || '').localeCompare(b.name || '', 'tr'));

    // 2. Tarih filtresi: Saat farkından dolayı sınırda kalan raporların düşmesini engellemek için gün başlangıcı (00:00:00) esas alınır
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    const weeklyReports = reports.filter(r => {
      if (!r.created_at) return false;
      const d = new Date(r.created_at);
      return !isNaN(d.getTime()) && d >= cutoffDate;
    });

    // 3. Hesaplamalar ve Detaylı Analizler
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
    
    const classDataMap = {};
    const teacherPerformance = {};
    const studentStatsMap = {};
    const dailyActivityMap = {}; // Günlük trend analizi

    // Son 'days' günün tarihlerini hazırla
    for (let i = 0; i < days; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      dailyActivityMap[key] = { date: key, count: 0, positive: 0, negative: 0 };
    }

    const categoryCounts = {
      Akademik: 0,
      Yoklama: 0,
      Program: 0,
      Sağlık: 0,
      'Girdi Çıktı': 0,
      'Dahili Ders': 0,
    };

    const categoryBreakdown = {
      Akademik: { name: 'Akademik', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, groupDist: {}, studentScores: {} },
      Yoklama: { name: 'Yoklama', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, groupDist: {}, studentScores: {} },
      Program: { name: 'Program', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, groupDist: {}, studentScores: {} },
      Sağlık: { name: 'Sağlık', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, groupDist: {}, studentScores: {} },
      'Girdi Çıktı': { name: 'Girdi Çıktı', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, groupDist: {}, studentScores: {} },
      'Dahili Ders': { name: 'Dahili Ders', count: 0, positiveCount: 0, negativeCount: 0, reports: [], classDist: {}, groupDist: {}, studentScores: {} },
    };

    let weeklyYoklamaCount = 0;
    let weeklyAkademikCount = 0;
    let weeklyDahiliCount = 0;
    let totalPositiveReports = 0;

    const validWeeklyReports = [];

    // Hangi öğrencinin hangi grupta olduğunu hızla bulmak için harita
    const studentToGroupMap = {};
    teacherGroups.forEach(grp => {
      (grp.student_ids || []).forEach(sid => {
        studentToGroupMap[sid] = grp.name + (grp.section ? ` (${grp.section})` : '');
      });
    });

    weeklyReports.forEach(r => {
      const sId = (r.student_id || '').trim();
      const st = studentMap[sId];
      if (!st) return;

      let category = r.category || 'Dahili Ders';
      if (category === 'Yemek') category = 'Yoklama';
      if (category === 'Namaz') category = 'Girdi Çıktı';
      if (category === 'Dahili') category = 'Dahili Ders';
      if (!categoryCounts.hasOwnProperty(category)) category = 'Dahili Ders';

      const basePts = CATEGORY_SCORES[category] || 1;
      const isPos = r.isPositive !== false;
      const pts = isPos ? basePts : -1;

      if (isPos) totalPositiveReports++;
      validWeeklyReports.push(r);

      // Günlük trend
      if (r.created_at) {
        const dayKey = r.created_at.slice(0, 10);
        if (dailyActivityMap[dayKey]) {
          dailyActivityMap[dayKey].count++;
          if (isPos) dailyActivityMap[dayKey].positive++;
          else dailyActivityMap[dayKey].negative++;
        }
      }

      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      if (category === 'Yoklama') weeklyYoklamaCount++;
      if (category === 'Akademik') weeklyAkademikCount++;
      if (category === 'Dahili Ders') weeklyDahiliCount++;

      const cls = st.class || 'Genel';
      const studentFullName = `${st.name} ${st.surname}`.trim();
      const groupName = studentToGroupMap[sId] || 'Grup Dışı';

      if (categoryBreakdown[category]) {
        categoryBreakdown[category].count += 1;
        if (isPos) categoryBreakdown[category].positiveCount += 1;
        else categoryBreakdown[category].negativeCount += 1;
        categoryBreakdown[category].classDist[cls] = (categoryBreakdown[category].classDist[cls] || 0) + 1;
        categoryBreakdown[category].groupDist[groupName] = (categoryBreakdown[category].groupDist[groupName] || 0) + 1;
        categoryBreakdown[category].studentScores[studentFullName] = (categoryBreakdown[category].studentScores[studentFullName] || 0) + pts;
        categoryBreakdown[category].reports.push({
          id: r.id,
          studentName: studentFullName,
          studentId: r.student_id,
          className: cls,
          groupName: groupName,
          content: r.content,
          isPositive: isPos,
          createdAt: r.created_at,
          createdBy: r.created_by,
          points: pts,
        });
      }

      // Sınıf agregasyonu
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

      // Öğrenci agregasyonu
      if (r.student_id) {
        if (!studentStatsMap[r.student_id]) {
          studentStatsMap[r.student_id] = {
            id: r.student_id,
            name: studentFullName,
            class: cls,
            groupName: groupName,
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

      const teacher = r.created_by || 'Bilinmeyen';
      teacherPerformance[teacher] = (teacherPerformance[teacher] || 0) + 1;
    });

    Object.keys(categoryBreakdown).forEach(cat => {
      categoryBreakdown[cat].reports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const total = categoryBreakdown[cat].count;
      categoryBreakdown[cat].efficiencyRate = total > 0 ? Math.round((categoryBreakdown[cat].positiveCount / total) * 100) : 0;
    });

    const topClasses = Object.values(classDataMap).map(c => {
      const eff = c.reportCount > 0 ? Math.round((c.positiveCount / c.reportCount) * 100) : 0;
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

    // Öğretmen Grupları Detaylı Analizi (Çetinkaya, Aldemir, Mısırlı, Güney...)
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
          class: st?.class || grp.section || 'Genel',
          score: sc,
          reportCount: repCount,
          positiveCount: stStat ? stStat.positiveCount : 0,
          negativeCount: stStat ? stStat.negativeCount : 0,
          dahiliCount: dahCount,
          lastNote: stStat ? stStat.lastNegativeNote : '',
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
        section: grp.section || '',
        displayName: `${grp.name}${grp.section ? ` (${grp.section})` : ''}`,
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
    }).sort((a, b) => b.score - a.score || b.efficiencyRate - a.efficiencyRate);

    const allStudentStats = Object.values(studentStatsMap);

    const topStudents = allStudentStats
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    const studentsNeedingSupport = allStudentStats
      .filter(s => s.negativeCount > 0 || s.score < 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 20);

    const overallEfficiency = validWeeklyReports.length > 0 
      ? Math.round((totalPositiveReports / validWeeklyReports.length) * 100) 
      : 100;

    const checkedOutStudents = students.filter(s => s.checkout_time);
    const dailyActivity = Object.values(dailyActivityMap).sort((a, b) => a.date.localeCompare(b.date));

    const summaryResult = {
      success: true,
      periodDays: days,
      allTimeReportsCount: reports.length, // Kurumun bugüne kadar kaydedilmiş kalıcı toplam rapor sayısı
      totalStudentsCount: students.length,
      checkedOutCount: checkedOutStudents.length,
      insideCount: students.length - checkedOutStudents.length,
      weeklyReportsCount: validWeeklyReports.length,
      weeklyYoklamaCount,
      weeklyAkademikCount,
      weeklyDahiliCount,
      overallEfficiency,
      categoryCounts,
      categoryBreakdown,
      dailyActivity,
      topClasses,
      topGroups,
      topStudents,
      studentsNeedingSupport,
      teacherPerformance,
      weeklyNamazCount: weeklyYoklamaCount,
    };

    setCached(cacheKey, summaryResult);
    return NextResponse.json(summaryResult, { headers: NO_STORE });

  } catch (error) {
    console.error('Weekly Summary API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}