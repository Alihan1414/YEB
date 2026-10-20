import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';
import { listAllDocs, readStr, readArr, docId } from '@/lib/firestoreRest';
import { analyzeText, classify } from '@/lib/aiMatcher';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['Akademik', 'Yoklama', 'Program', 'Sağlık', 'Girdi Çıktı', 'Dahili Ders'];

async function loadFromCloud(instId) {
  const ok = (i) => instId === 'platform' || isInstitutionMatch(normalizeInstitutionId(i || 'bolu-kilicaslan'), instId);
  const [sDocs, gDocs] = await Promise.all([listAllDocs('students'), listAllDocs('teacher_groups')]);
  const students = sDocs.filter(d => ok(readStr(d.fields, 'institution_id', 'institutionId'))).map(d => ({
    id: docId(d), name: readStr(d.fields, 'name'), surname: readStr(d.fields, 'surname'), class: readStr(d.fields, 'class'),
  }));
  const groups = gDocs.filter(d => ok(readStr(d.fields, 'institution_id', 'institutionId'))).map(d => ({
    id: docId(d), name: readStr(d.fields, 'name'), section: readStr(d.fields, 'section'),
    aliases: readArr(d.fields, 'aliases'), teacher_name: readStr(d.fields, 'teacher_name'), student_ids: readArr(d.fields, 'student_ids'),
  }));
  return { students, groups };
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

async function askGemini(text, students, groups, local) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) return null;

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });

  const groupOf = new Map();
  groups.forEach(g => (g.student_ids || []).forEach(id => groupOf.set(id, g.section ? `${g.name}/${g.section}` : g.name)));
  const studentLines = students.map(s => `${s.id}|${`${s.name || ''} ${s.surname || ''}`.trim()}|${s.class || ''}|${groupOf.get(s.id) || ''}`).join('\n');
  const groupLines = groups.map(g => `${g.id}|${g.name}|${g.section || ''}|hoca:${g.teacher_name || ''}|takma adlar:${(g.aliases || []).join(', ')}|${(g.student_ids || []).length} talebe`).join('\n');

  const prompt = `Sen bir Türk yurt/medrese kurumunda öğretmenlerin sesli veya yazılı söylediği kısa cümleleri anlayan bir asistansın.
Görevin: cümlede kimden bahsedildiğini (tek talebe, birden çok talebe, öğretmen grubu, bölüm veya herkes) bulmak ve temiz bir rapor metni çıkarmak.

KURALLAR
1. Gruplar öğretmen soyadıyla anılır (ör. "Aldemir", "Aldemir'in talebeleri", "Aldemirgil", "Serkan hocanın grubu", "Mısırlılar"). Grup söylenirse groupIds'e grubun id'sini yaz.
2. "Çetinkaya" adında İKİ grup var (Hazırlık ve İhzari). "Hazırlık", "Mustafa" geçerse Hazırlık; "İhzari", "İbrahim" geçerse İhzari grubunu seç. Belirsizse ikisini de yaz ve note alanında belirt.
3. Bölüm adı söylenirse (Hazırlık, İbtidai, İhzari, Tekamül Altı, K. Kerim, Muh. K. Kerim) ve bir grup adı değil de bölümün tamamı kastediliyorsa sections'a yaz.
4. "hariç / dışında / olmadan" ile belirtilen talebeleri excludedStudentIds'e yaz.
5. "X grubundan A ve B gelmedi" gibi cümlelerde SADECE A ve B kastedilir: groupIds boş bırak, studentIds'e A ve B'yi yaz.
6. Sadece ad söylendiyse ve birden çok talebeye uyuyorsa, gruptan/bağlamdan çıkar; çıkaramazsan studentIds'e EKLEME, note'a yaz.
7. Ses tanıma hatalarını tolere et (ör. "Aldemir" → "Al demir", "Mısırlı" → "mısırlı lar").
8. "herkes", "bütün talebeler" → all=true.
9. extractedText: isim/grup/bölüm adları OLMADAN, kurallı, kısa Türkçe cümle (ör. "Yatsı namazına katılmadı.").
10. category şu 6 değerden biri: ${VALID_CATEGORIES.join(', ')}. Namaz/izin/giriş-çıkış → "Girdi Çıktı". Revir/hasta → "Sağlık". Etüt/dahili ders/ezber dersi → "Dahili Ders".
11. isPositive: olumsuz durum (gelmedi, uyudu, geç kaldı, hasta, yapmadı...) false, aksi true.
12. YALNIZCA aşağıdaki listelerdeki id'leri kullan. Uydurma id yazma.

GRUPLAR (id|ad|bölüm|hoca|takma adlar|sayı):
${groupLines}

TALEBELER (id|ad soyad|bölüm|grup):
${studentLines}

YEREL MOTORUN ÖN TAHMİNİ (yanlış olabilir, kontrol et):
gruplar=${JSON.stringify(local.matchedGroupIds)} talebeler=${JSON.stringify(local.matchedStudents.slice(0, 25).map(s => s.id))} hariç=${JSON.stringify(local.excludedStudents)}

CÜMLE: """${text.replace(/"""/g, '')}"""

JSON şeması:
{"groupIds":[],"studentIds":[],"excludedStudentIds":[],"sections":[],"all":false,"extractedText":"","category":"","isPositive":true,"note":""}`;

  const result = await withTimeout(model.generateContent(prompt), 8000);
  const raw = result.response.text().trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(raw);
}

export async function POST(req) {
  try {
    const { text, institutionId = 'bolu-kilicaslan', students: clientStudents, teacherGroups: clientGroups } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Metin girişi zorunludur.' }, { status: 400 });
    }
    const instId = normalizeInstitutionId(institutionId);

    // Öğrenci ve grup listesi: önce istemcinin gönderdiği (hızlı), yoksa buluttan
    let students = Array.isArray(clientStudents) ? clientStudents.filter(s => s && s.id).map(s => {
      const full = (s.fullName || `${s.name || ''} ${s.surname || ''}`).trim();
      const parts = full.split(/\s+/);
      return { id: String(s.id), name: s.name ?? parts.slice(0, -1).join(' ') ?? full, surname: s.surname ?? parts.slice(-1)[0] ?? '', class: s.class || '' };
    }) : [];
    let groups = Array.isArray(clientGroups) ? clientGroups.filter(g => g && g.id).map(g => ({
      id: String(g.id), name: g.name || '', section: g.section || '', aliases: Array.isArray(g.aliases) ? g.aliases : [],
      teacher_name: g.teacher_name || '', student_ids: Array.isArray(g.student_ids) ? g.student_ids : [],
    })) : [];

    if (!students.length || !groups.length) {
      try {
        const cloud = await loadFromCloud(instId);
        if (!students.length) students = cloud.students;
        if (!groups.length) groups = cloud.groups;
      } catch (e) { console.warn('AI cloud list load failed:', e.message); }
    }

    // 1) Yerel motor (her zaman, milisaniyeler içinde)
    const local = analyzeText(text, students, groups);

    // 2) Gemini (varsa) — sonucu doğrula, geçersiz id'leri at
    let final = local;
    try {
      const g = await askGemini(text, students, groups, local);
      if (g) {
        const sMap = new Map(students.map(s => [s.id, s]));
        const gMap = new Map(groups.map(x => [x.id, x]));
        const ids = new Set();
        const groupIds = (g.groupIds || []).filter(id => gMap.has(id));
        groupIds.forEach(id => gMap.get(id).student_ids.forEach(sid => sMap.has(sid) && ids.add(sid)));
        (g.sections || []).forEach(sec => {
          const t = String(sec).toLocaleLowerCase('tr-TR');
          students.forEach(s => { if ((s.class || '').toLocaleLowerCase('tr-TR') === t) ids.add(s.id); });
        });
        if (g.all) students.forEach(s => ids.add(s.id));
        (g.studentIds || []).forEach(id => sMap.has(id) && ids.add(id));
        const excluded = (g.excludedStudentIds || []).filter(id => sMap.has(id));
        excluded.forEach(id => ids.delete(id));

        if (ids.size > 0) {
          const list = [...ids].map(id => { const s = sMap.get(id); return { id, name: `${s.name} ${s.surname}`.trim(), class: s.class }; });
          const fallbackCls = classify(text);
          final = {
            ...local,
            matchedStudents: list,
            matchedStudentId: list[0].id,
            matchedStudentName: list[0].name,
            matchedGroupIds: groupIds,
            matchedGroupName: groupIds.length ? groupIds.map(id => { const x = gMap.get(id); return x.section ? `${x.name} (${x.section})` : x.name; }).join(', ') : null,
            matchedClassName: (g.sections || []).join(', ') || null,
            excludedStudents: excluded.map(id => `${sMap.get(id).name} ${sMap.get(id).surname}`.trim()),
            extractedText: (g.extractedText || '').trim() || local.extractedText,
            category: VALID_CATEGORIES.includes(g.category) ? g.category : fallbackCls.category,
            isPositive: typeof g.isPositive === 'boolean' ? g.isPositive : fallbackCls.isPositive,
            notes: [...(g.note ? [g.note] : []), ...local.notes.filter(n => !/birden fazla talebeye/.test(n) || !list.length)],
            confidence: 0.95,
            engine: 'gemini+local',
          };
        }
      }
    } catch (e) {
      console.warn('Gemini unavailable, using local engine:', e.message);
    }

    return NextResponse.json({ success: true, data: { ...final, rawInput: text } });
  } catch (error) {
    console.error('AI Parser Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
