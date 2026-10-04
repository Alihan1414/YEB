import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readDb } from '@/lib/db';
import { normalizeInstitutionId, isInstitutionMatch } from '@/lib/institution';

export const dynamic = 'force-dynamic';

// ─── 1. Türkçe Karakter Temizleme & Normalizasyon ────────────────────────────
function trClean(str) {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── 2. Boşluksuz Türkçe Normalizasyon ───────────────────────────────────────
function trSpaceless(str) {
  return trClean(str).replace(/\s+/g, '');
}

// ─── 3. Çift / Tekrarlayan Harfleri Teke İndirme ─────────────────────────────
function collapseDuplicates(str) {
  if (!str) return '';
  return str.replace(/(.)\1+/g, '$1');
}

// ─── 4. Türkçe Çekim Eklerini Ayıklama (Kök Bulma) ───────────────────────────
function stripTurkishSuffixes(word) {
  if (!word || word.length <= 3) return word;
  let w = trClean(word);
  // İsmin halleri, tamlama, çoğul ve yapım ekleri
  w = w.replace(/(lerden|lardan|lerde|larda|lerin|ların|lerini|larını|lere|lara|ler|lar|den|dan|ten|tan|de|da|te|ta|nin|nın|nün|nun|in|ın|un|ün|ye|ya|yu|yü|yi|yı|e|a|i|ı|u|ü|le|la|ce|ca)$/gi, '');
  return w;
}

// ─── 5. Grup ve Sınıf İsimleri Normalizasyonu ────────────────────────────────
function normalizeGroup(str) {
  if (!str) return '';
  let s = trSpaceless(str);
  s = s.replace(/(grubu|ekibi|sinifi|takimi|talebe|talebeleri|ogrencileri|ogrenci|arkadaslar|lar|ler|in|ın|un|ün|den|dan|ten|tan|de|da|te|ta|e|a|i|ı|u|ü)$/gi, '');
  return collapseDuplicates(s);
}

// ─── 6. Sınıf İsmi Eşleştirme Normalizasyonu (11-A, 11A, 11/A, 10 B) ─────────
function normalizeClass(str) {
  if (!str) return '';
  return trClean(str)
    .replace(/\s*(sinifi|sinif|sube|subesi)\s*/gi, '')
    .replace(/[\s\-\/\.]+/g, '')
    .trim();
}

// ─── 7. Levenshtein Mesafesi Hesaplama ─────────────────────────────────────────
function levenshteinDistance(s1, s2) {
  if (!s1) return s2 ? s2.length : 0;
  if (!s2) return s1 ? s1.length : 0;
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 0;

  const matrix = Array.from({ length: b.length + 1 }, () =>
    new Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// ─── 8. Fonetik & Bulanık Kelime Benzerlik Skoru (0 - 100) ────────────────────
function fuzzyWordScore(w1, w2) {
  if (!w1 || !w2) return 0;
  const c1 = collapseDuplicates(trClean(w1));
  const c2 = collapseDuplicates(trClean(w2));
  if (c1 === c2) return 100;
  
  // Ekleri atıp kökleri karşılaştır
  const root1 = stripTurkishSuffixes(c1);
  const root2 = stripTurkishSuffixes(c2);
  if (root1 && root2 && (root1 === root2 || root1.startsWith(root2) || root2.startsWith(root1))) {
    if (Math.abs(root1.length - root2.length) <= 2 && Math.min(root1.length, root2.length) >= 3) {
      return 90;
    }
  }

  const maxLen = Math.max(c1.length, c2.length);
  if (Math.abs(c1.length - c2.length) > 2) return 0;
  const dist = levenshteinDistance(c1, c2);
  const allowed = maxLen <= 3 ? 0 : maxLen <= 5 ? 1 : 2;
  if (dist <= allowed) {
    return Math.round((1 - dist / maxLen) * 100);
  }
  return 0;
}

// ─── 9. Genel Fonetik Benzerlik Skoru ─────────────────────────────────────────
function fuzzyMatchScore(query, target) {
  if (!query || !target) return 0;
  const cleanQ = trClean(query);
  const cleanT = trClean(target);
  if (!cleanQ || !cleanT) return 0;
  if (cleanQ === cleanT) return 100;

  const spaceQ = trSpaceless(cleanQ);
  const spaceT = trSpaceless(cleanT);
  if (spaceQ === spaceT) return 99;

  const collQ = collapseDuplicates(cleanQ);
  const collT = collapseDuplicates(cleanT);
  if (collQ === collT) return 98;

  const normQ = normalizeGroup(cleanQ);
  const normT = normalizeGroup(cleanT);
  if (normQ && normT && (normQ === normT || normQ.includes(normT) || normT.includes(normQ))) {
    return 96;
  }

  if (spaceQ.includes(spaceT) || spaceT.includes(spaceQ)) return 95;

  const qWords = collQ.split(/\s+/).filter(Boolean);
  const tWords = collT.split(/\s+/).filter(Boolean);

  if (qWords.length === tWords.length && qWords.length > 1) {
    let allWordsMatch = true;
    for (let i = 0; i < qWords.length; i++) {
      const dist = levenshteinDistance(qWords[i], tWords[i]);
      const maxLen = Math.max(qWords[i].length, tWords[i].length);
      const allowed = maxLen <= 3 ? 0 : maxLen <= 5 ? 1 : 2;
      if (dist > allowed) {
        allWordsMatch = false;
        break;
      }
    }
    if (allWordsMatch) return 94;
  }

  const maxLen = Math.max(collQ.length, collT.length);
  const minLen = Math.min(collQ.length, collT.length);
  if (maxLen === 0) return 0;

  if (maxLen - minLen > 2 && !spaceQ.includes(spaceT) && !spaceT.includes(spaceQ)) {
    return 0;
  }

  const dist = levenshteinDistance(collQ, collT);
  const allowed = maxLen <= 3 ? 0 : maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;

  if (dist <= allowed) {
    return Math.round((1 - (dist / maxLen)) * 100);
  }

  return 0;
}

// ─── 10. Metinden İsim, Grup ve Sınıfları Ayıklayarak Temiz Rapor Üretme ────────
function stripStudentNames(text, matchedStudents = [], matchedGroupNames = [], matchedClassName = null) {
  if (!text) return '';

  const normGroups = matchedGroupNames.map(g => normalizeGroup(g)).filter(Boolean);
  const normClass = matchedClassName ? normalizeClass(matchedClassName) : null;

  const studentTokens = new Set();
  matchedStudents.forEach(st => {
    trClean(st.name || '').split(/\s+/).forEach(w => { 
      if (w.length >= 2) {
        studentTokens.add(w);
        studentTokens.add(stripTurkishSuffixes(w));
      }
    });
    collapseDuplicates(trClean(st.name || '')).split(/\s+/).forEach(w => { 
      if (w.length >= 2) {
        studentTokens.add(w);
        studentTokens.add(stripTurkishSuffixes(w));
      }
    });
  });

  const words = text.split(/\s+/);
  const keep = [];
  
  let i = 0;
  while (i < words.length) {
    let matched = false;

    // 1. Çok kelimeli veya tekil grup adı eşleşmesini tara
    for (let len = 3; len >= 1; len--) {
      if (i + len <= words.length) {
        const slice = words.slice(i, i + len).join(' ');
        const normSlice = normalizeGroup(slice);
        if (normGroups.some(ng => ng && (ng === normSlice || normSlice.includes(ng) || ng.includes(normSlice)))) {
          i += len;
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    // 2. Sınıf adı kontrolü (örn: 11-A, 10/B, 11-A sınıfı)
    if (normClass) {
      const slice = normalizeClass(words[i]);
      if (slice === normClass || slice.includes(normClass)) {
        i++;
        continue;
      }
    }

    // 3. Öğrenci ismi ve takı kelimeleri kontrolü
    const cleanWord = trClean(words[i]);
    const rootWord = stripTurkishSuffixes(cleanWord);
    const collWord = collapseDuplicates(cleanWord);

    if (/^(adli|isimli|olan|adlarindaki|ogrenciler|ogrencileri|talebeler|talebeleri|arkadaslar|ogrenci|talebe|grup|grubu|ekip|ekibi|sinifi|sinif)$/i.test(cleanWord)) {
      i++;
      continue;
    }

    let isStMatched = false;
    for (const token of studentTokens) {
      if (token.length >= 3 && cleanWord.length >= 3) {
        if (cleanWord === token || rootWord === token || collWord === token) {
          isStMatched = true;
          break;
        }
        if (cleanWord.startsWith(token) && cleanWord.length - token.length <= 4) {
          isStMatched = true;
          break;
        }
        if (Math.abs(cleanWord.length - token.length) <= 2) {
          const score = fuzzyWordScore(cleanWord, token);
          if (score >= 80) {
            isStMatched = true;
            break;
          }
        }
      }
    }

    if (isStMatched) {
      i++;
      continue;
    }

    keep.push(words[i]);
    i++;
  }

  let cleaned = keep.join(' ')
    .replace(/\b(adli|isimli|olan|grubu|ekibi|ogrencileri|talebeleri|sinifi|sinif)\b/gi, '')
    .replace(/^[\s,;:\-–—\.\/\\&]+/, '')
    .replace(/^\s*(ve|ile|de|da|dahi|hepsi|tamami|komple|eksiksiz)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Türkçe yazım ve kategori düzeltmeleri
  cleaned = cleaned
    .replace(/\bdahil derste\b/gi, 'Dahili derste')
    .replace(/\bdahil derse\b/gi, 'Dahili derse')
    .replace(/\bnamazda\b/gi, 'Namazda')
    .replace(/\brevirde\b/gi, 'Revirde')
    .replace(/\betutte\b/gi, 'Etütte');

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
  }

  return cleaned || 'Faaliyet kaydı tamamlandı.';
}

export async function POST(req) {
  try {
    const { 
      text, 
      institutionId = 'bolu-kilicaslan', 
      students: clientStudents,
      teacherGroups: clientTeacherGroups
    } = await req.json();

    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: 'Metin girişi zorunludur.' }, { status: 400 });
    }

    const normInstId = normalizeInstitutionId(institutionId);

    // ─── 1. Öğrenci Listesini Topla (Client + Local DB + Firestore) ───────────────
    const studentMap = new Map();

    if (Array.isArray(clientStudents) && clientStudents.length > 0) {
      clientStudents.forEach(s => {
        if (s && s.id) {
          studentMap.set(String(s.id), {
            id: String(s.id),
            fullName: (s.fullName || `${s.name || ''} ${s.surname || ''}`).trim(),
            class: s.class || ''
          });
        }
      });
    }

    try {
      const dbData = readDb();
      (dbData.students || []).forEach(s => {
        const sInst = normalizeInstitutionId(s.institution_id || s.institutionId || 'bolu-kilicaslan');
        if (normInstId === 'platform' || isInstitutionMatch(sInst, normInstId)) {
          const fullName = `${s.name || ''} ${s.surname || ''}`.trim();
          studentMap.set(s.id, {
            id: s.id,
            fullName,
            class: s.class || ''
          });
        }
      });
    } catch (e) {}

    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
      if (projectId && apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);

        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}&pageSize=1000`,
          { cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data && data.documents) {
            data.documents.forEach(doc => {
              const fields = doc.fields || {};
              const docInst = normalizeInstitutionId(fields.institution_id?.stringValue || fields.institutionId?.stringValue || 'bolu-kilicaslan');
              if (normInstId === 'platform' || isInstitutionMatch(docInst, normInstId)) {
                const id = doc.name.split('/').pop();
                const fullName = `${fields.name?.stringValue || ''} ${fields.surname?.stringValue || ''}`.trim();
                studentMap.set(id, {
                  id,
                  fullName,
                  class: fields.class?.stringValue || ''
                });
              }
            });
          }
        }
      }
    } catch (e) {}

    const students = Array.from(studentMap.values());

    // ─── 2. Öğretmen Gruplarını Topla (Client + Local DB + Firestore) ────────────
    const groupsMap = new Map();

    if (Array.isArray(clientTeacherGroups) && clientTeacherGroups.length > 0) {
      clientTeacherGroups.forEach(g => {
        if (g && g.id) {
          groupsMap.set(String(g.id), {
            id: String(g.id),
            name: g.name || '',
            teacher_name: g.teacher_name || '',
            student_ids: Array.isArray(g.student_ids) ? g.student_ids : []
          });
        }
      });
    }

    try {
      const dbData = readDb();
      if (dbData.teacher_groups) {
        dbData.teacher_groups.forEach(g => {
          const gInst = normalizeInstitutionId(g.institution_id || g.institutionId || 'bolu-kilicaslan');
          if ((normInstId === 'platform' || isInstitutionMatch(gInst, normInstId)) && !groupsMap.has(g.id)) {
            groupsMap.set(g.id, g);
          }
        });
      }
    } catch (e) {}

    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
      if (projectId && apiKey) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1200);

        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/teacher_groups?key=${apiKey}&pageSize=200`,
          { cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data && data.documents) {
            data.documents.forEach(doc => {
              const fields = doc.fields || {};
              const docInst = normalizeInstitutionId(fields.institution_id?.stringValue || fields.institutionId?.stringValue || 'bolu-kilicaslan');
              if (normInstId === 'platform' || isInstitutionMatch(docInst, normInstId)) {
                const id = doc.name.split('/').pop();
                const sIds = (fields.student_ids?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
                if (!groupsMap.has(id)) {
                  groupsMap.set(id, {
                    id,
                    name: fields.name?.stringValue || '',
                    teacher_name: fields.teacher_name?.stringValue || '',
                    student_ids: sIds,
                  });
                }
              }
            });
          }
        }
      }
    } catch (e) {}

    const teacherGroups = Array.from(groupsMap.values());

    // ─── 3. Gemini 2.5 Flash Doğal Türkçe & İnsan Dili Analiz Motoru ─────────────
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Sen Türk okul ve yurt eğitim kurumları için geliştirilmiş DÜNYA STANDARTLARINDA, TÜRKÇE VE İNSAN DİLİNİ EN DERİNİNE KADAR ANLAYAN YÜKSEK ZEKA SEVİYELİ SES VE METİN ANALİZ UZMANISIN.

Kullanıcılar katı komutlar yerine GÜNLÜK TÜRKÇE KONUŞMA DİLİ, DEYİMLER, ARGO, HIZLI SESLİ MESAJLAR, ŞİVELER, DEVREK CÜMLELER veya YURT JARGONU kullanabilirler.
Görevin: Söylenen Türkçe cümleyi derinlemesine anlayıp; bahsi geçen kişi(ler)i, grubu veya sınıfı tespit etmek, eylemin mahiyetini ve duygu tonunu (olumlu/olumsuz) belirlemek ve temiz bir faaliyet raporu oluşturmaktır.

# 1. TÜRKÇE DİL VE VARLIK EŞLEŞTİRME KURALLARI:

A. TEKİL KİŞİ VE TAM İSİM ÖNCELİĞİ:
   - Eğer metinde tek bir öğrencinin adı/soyadı geçiyorsa (Örn: "İsmail Abbas namazda"), YALNIZCA o öğrenciyi eşleştir.
   - Sadece ilk adı aynı olan veya sadece soyadı aynı olan başka öğrencileri LİSTEYE KESİNLİKLE EKLEME!
   - Türkçe çekim eklerini (Örn: "Ahmet'e", "Mehmet'ten", "Yusuf'ta", "Ömer'in", "Aliler") doğal olarak algıla ve kök ismi bul.
   - Fonetik yazım hatalarını ve sesli harf uzatmalarını tolere et (Örn: "karrtallar", "yusuuf", "ahmeeet").

B. ÇOKLU ÖĞRENCİ BELİRTİMİ:
   - Metinde "ve", "ile", virgül veya peş peşe isimler varsa (Örn: "Ahmet Kaya ve Mehmet Demir ödevini teslim etti") her ikisini de 'matchedStudents' listesine ekle.

C. GRUP VE SINIF ADI TESPİTİ:
   - Kullanıcı öğretmen grubundan bahsettiğinde (Örn: "KaraKARTAL", "kara kartallar", "kartallar", "aslanlar", "hilal timi"):
     * 'matchedGroupName' alanına grup adını yaz.
     * O gruptaki TÜM öğrencileri 'matchedStudents' listesine ekle.
   - Kullanıcı bir sınıftan bahsettiğinde (Örn: "11-A komple seminerdeydi", "10/B derste tam", "9A sınıfı"):
     * 'matchedClassName' alanına sınıfı yaz (Örn: "11-A").
     * O sınıfa ait TÜM öğrencileri 'matchedStudents' listesine ekle.

D. RAPOR METNİ TEMİZLİĞİ ('extractedText'):
   - extractedText alanı, YALNIZCA yapılan faaliyet, eylem, durum veya değerlendirmeyi içermelidir.
   - extractedText içinde KESİNLİKLE öğrenci isimleri, soyisimleri, grup veya sınıf adları (Örn: "Ahmet Kaya", "Kara kartallar", "11-A") YER ALMAMALIDIR!
   - extractedText dilbilgisi kurallarına uygun, ilk harfi büyük, düzgün ve kurumsal bir Türkçe cümle olmalıdır.

# 2. KATEGORİ BELİRLEME (Yalnızca şu 6 resmi kategoriden biri):
1. "Akademik": Ödev, test, sınav, soru çözümü, deneme, netler, kitap okuma, ders çalışma, proje, ezber, başarı.
2. "Yoklama": Yoklama, tam kadro, eksiksiz, hepsi burada, yemekhane, kahvaltı, çorba, akşam yemeği, oda kontrolü.
3. "Girdi Çıktı": Kuruma giriş, çıkış, namaz (sabah, öğle, ikindi, akşam, yatsı), cemaat, mescit, çarşı izni, evci izni, vaktinde gelme, geç gelme.
4. "Sağlık": Revir, hasta, ilaç, doktor, hastane, tansiyon, ateş, baş dönmesi, serum, pansuman, dinlenme. (NOT: Öğrenci soyadındaki "Abbas" gibi heceleri asla sağlık sanma!).
5. "Program": Seminer, konferans, sohbet, kurum faaliyeti, gezi, maç, turnuva, sinema, toplu etkinlik.
6. "Dahili Ders": Dahili ders, kurum içi özel ders, birebir etüt, hoca dersi, medrese/kurs müfredat dersi.

# 3. OLUMLU / OLUMSUZ (isPositive) DUYGU ANALİZİ:
- Olumlu (true): "tam yaptı", "eksiksiz", "başarılı", "katıldı", "dinledi", "gayretli", "soruları çözdü", "vaktinde geldi", "ödül aldı".
- Olumsuz (false): "dersi kaynattı", "dinlemedi", "uyudu", "kalkamadı", "inmedi", "gecikti", "kaçtı", "ödevini yapmamış", "bahane üretti", "tartıştı", "raporlu/hasta", "gelmedi", "yoktu".

# ÖRNEK ANALİZLER:
- "Yusuf Demir revire çıktı ateşi var dinleniyor" ->
  matchedStudents: [{"id": "...", "name": "Yusuf Demir"}], extractedText: "Revire çıktı, ateşi yüksek olduğu için dinleniyor.", category: "Sağlık", isPositive: false
- "Kara kartallar bu akşamki sohbete tam kadro katıldı" ->
  matchedGroupName: "Kara kartallar", extractedText: "Bu akşamki sohbete tam kadro katılım sağladı.", category: "Program", isPositive: true
- "11-A dahili derste çok aktifti soruların hepsini bitirdiler" ->
  matchedClassName: "11-A", extractedText: "Dahili derste çok aktifti, soruların hepsini bitirdi.", category: "Dahili Ders", isPositive: true
- "Ahmet dersi kaynattı hocayı hiç dinlemedi" ->
  matchedStudents: [{"id": "...", "name": "Ahmet ..."}], extractedText: "Dersi kaynattı ve hocayı dinlemedi.", category: "Akademik", isPositive: false
- "Ömer Faruk yatsı namazına inmedi" ->
  matchedStudents: [{"id": "...", "name": "Ömer Faruk"}], extractedText: "Yatsı namazına inmedi.", category: "Girdi Çıktı", isPositive: false

Kayıtlı Öğrenciler Listesi:
${JSON.stringify(students, null, 2)}

Kayıtlı Öğretmen Grupları Listesi:
${JSON.stringify(teacherGroups, null, 2)}

Kullanıcının Söylediği Metin / Ses Kaydı:
"${text.replace(/"/g, '\\"')}"

SADECE geçerli JSON formatında yanıt ver, başka hiçbir açıklama ekleme:
{
  "matchedStudents": [
    { "id": "öğrenci-id", "name": "Ad Soyad", "class": "Sınıf" }
  ],
  "matchedStudentId": "ilk öğrencinin id'si veya null",
  "matchedStudentName": "ilk öğrencinin adı veya null",
  "matchedGroupName": "Eğer bir gruptan bahsedildiyse grup adı veya null",
  "matchedClassName": "Eğer bir sınıftan bahsedildiyse sınıf adı (örn: 11-A) veya null",
  "confidence": 0.95,
  "extractedText": "Öğrenci, grup ve sınıf isimlerinden arındırılmış temiz faaliyet metni",
  "category": "Girdi Çıktı",
  "isPositive": true,
  "rawInput": "${text.replace(/"/g, '\\"')}"
}`;

        const result = await model.generateContent(prompt);
        const resultText = result.response.text().trim();
        const cleanedText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanedText);

        const validCategories = ['Akademik', 'Yoklama', 'Program', 'Sağlık', 'Girdi Çıktı', 'Dahili Ders'];
        if (parsed.category === 'Yemek') parsed.category = 'Yoklama';
        if (parsed.category === 'Namaz' || /(namaz|cemaat)/i.test(text)) parsed.category = 'Girdi Çıktı';
        if (parsed.category === 'Dahili' || /(dahil|dahili)/i.test(text)) parsed.category = 'Dahili Ders';
        if (!validCategories.includes(parsed.category)) {
          parsed.category = 'Girdi Çıktı';
        }

        if (!Array.isArray(parsed.matchedStudents)) {
          parsed.matchedStudents = [];
          if (parsed.matchedStudentId) {
            parsed.matchedStudents.push({
              id: parsed.matchedStudentId,
              name: parsed.matchedStudentName || '',
              class: ''
            });
          }
        } else if (parsed.matchedStudents.length > 0 && !parsed.matchedStudentId) {
          parsed.matchedStudentId = parsed.matchedStudents[0].id;
          parsed.matchedStudentName = parsed.matchedStudents[0].name;
        }

        // Grup adı veya metinde grup eşleşmesi bulunduysa grup üyelerini ekle
        const matchedGrpNames = [];
        if (parsed.matchedGroupName) matchedGrpNames.push(parsed.matchedGroupName);

        teacherGroups.forEach(grp => {
          const normGrp = normalizeGroup(grp.name);
          const normText = normalizeGroup(text);
          if (normGrp && (normText.includes(normGrp) || normGrp.includes(normText) || fuzzyMatchScore(text, grp.name) >= 75)) {
            if (!matchedGrpNames.includes(grp.name)) matchedGrpNames.push(grp.name);
            (grp.student_ids || []).forEach(stId => {
              const st = students.find(s => s.id === stId);
              if (st && !parsed.matchedStudents.some(m => m.id === st.id)) {
                parsed.matchedStudents.push({
                  id: st.id,
                  name: st.fullName,
                  class: st.class || ''
                });
              }
            });
          }
        });

        // Sınıf adı tespit edildiyse sınıf üyelerini ekle
        if (parsed.matchedClassName) {
          const targetNormClass = normalizeClass(parsed.matchedClassName);
          students.forEach(st => {
            if (st.class && normalizeClass(st.class) === targetNormClass) {
              if (!parsed.matchedStudents.some(m => m.id === st.id)) {
                parsed.matchedStudents.push({
                  id: st.id,
                  name: st.fullName,
                  class: st.class
                });
              }
            }
          });
        }

        parsed.extractedText = stripStudentNames(parsed.extractedText || text, parsed.matchedStudents, matchedGrpNames, parsed.matchedClassName);

        return NextResponse.json({ success: true, data: parsed });
      } catch (err) {
        console.warn("Gemini execution failed, utilizing advanced local matcher:", err);
      }
    }

    // ─── 4. Gelişmiş Yerel Token Tüketimli & Doğal Dil Eşleştirme Motoru ────────
    const cleanedInput = trClean(text);
    const spacelessInput = trSpaceless(text);
    const inputWords = cleanedInput.split(/\s+/).filter(Boolean);
    const matchedStudentsList = [];
    const matchedGroupNames = [];
    let matchedClassName = null;
    const matchedReservedWords = new Set();

    // A. Sınıf Eşleştirmesi (örn: 11-A, 10/B, 9-A sınıfı)
    for (const student of students) {
      if (!student.class) continue;
      const cleanClass = trClean(student.class);
      const normCls = normalizeClass(student.class);
      if (normCls && normCls.length >= 2) {
        if (cleanedInput.includes(cleanClass) || spacelessInput.includes(normCls)) {
          matchedClassName = student.class;
          cleanClass.split(/\s+/).forEach(w => matchedReservedWords.add(w));
          break;
        }
      }
    }

    if (matchedClassName) {
      const targetNormClass = normalizeClass(matchedClassName);
      students.forEach(st => {
        if (st.class && normalizeClass(st.class) === targetNormClass) {
          if (!matchedStudentsList.some(m => m.id === st.id)) {
            matchedStudentsList.push({
              id: st.id,
              name: st.fullName,
              class: st.class
            });
          }
        }
      });
    }

    // B. Öğretmen Gruplarını Bulanık Eşleştir
    for (const grp of teacherGroups) {
      if (!grp.name) continue;
      const cleanGrp = trClean(grp.name);
      const spaceGrp = trSpaceless(grp.name);
      const normGrp = normalizeGroup(grp.name);
      let grpMatched = false;

      if (normGrp && (normalizeGroup(cleanedInput).includes(normGrp) || normGrp.includes(normalizeGroup(cleanedInput)))) {
        grpMatched = true;
      }

      if (!grpMatched && (fuzzyMatchScore(cleanedInput, cleanGrp) >= 75 || fuzzyMatchScore(spacelessInput, spaceGrp) >= 75)) {
        grpMatched = true;
      }

      if (!grpMatched && inputWords.length > 0) {
        for (let len = 4; len >= 1; len--) {
          for (let i = 0; i <= inputWords.length - len; i++) {
            const windowPhrase = inputWords.slice(i, i + len).join(' ');
            const windowSpaceless = trSpaceless(windowPhrase);
            const windowNorm = normalizeGroup(windowPhrase);

            if (
              (normGrp && windowNorm === normGrp) ||
              fuzzyMatchScore(windowPhrase, cleanGrp) >= 75 ||
              fuzzyMatchScore(windowSpaceless, spaceGrp) >= 75
            ) {
              grpMatched = true;
              break;
            }
          }
          if (grpMatched) break;
        }
      }

      if (grpMatched) {
        matchedGroupNames.push(grp.name);
        cleanGrp.split(/\s+/).forEach(w => matchedReservedWords.add(w));
        collapseDuplicates(cleanGrp).split(/\s+/).forEach(w => matchedReservedWords.add(w));
        matchedReservedWords.add(spaceGrp);
        matchedReservedWords.add(normGrp);

        (grp.student_ids || []).forEach(stId => {
          const st = students.find(s => s.id === stId);
          if (st && !matchedStudentsList.some(m => m.id === st.id)) {
            matchedStudentsList.push({
              id: st.id,
              name: st.fullName,
              class: st.class || ''
            });
          }
        });
      }
    }

    // C. Öğrencileri Token Tüketimi & Ayrıştırma İle Eşleştir (Tam İsim Önceliği)
    const candidateMatches = [];

    for (const student of students) {
      if (matchedStudentsList.some(m => m.id === student.id)) continue;

      const cleanFullName = trClean(student.fullName);
      const parts = cleanFullName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] || '';
      const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

      // 1. Tam İsim Bitişik Eşleşmesi (örn: 'ismail abbas' -> kelime index 0 ve 1)
      if (parts.length >= 2) {
        for (let i = 0; i <= inputWords.length - parts.length; i++) {
          let fullMatch = true;
          for (let p = 0; p < parts.length; p++) {
            if (matchedReservedWords.has(inputWords[i + p])) {
              fullMatch = false;
              break;
            }
            if (fuzzyWordScore(inputWords[i + p], parts[p]) < 80) {
              fullMatch = false;
              break;
            }
          }
          if (fullMatch) {
            const usedIndices = [];
            for (let p = 0; p < parts.length; p++) usedIndices.push(i + p);
            candidateMatches.push({
              student,
              score: 150,
              type: 'full',
              usedIndices
            });
          }
        }
      }

      // 2. Tekil İsim Eşleşmesi (Sadece tam isim eşleşmediyse devreye girer)
      for (let i = 0; i < inputWords.length; i++) {
        const word = inputWords[i];
        if (word.length < 3 || matchedReservedWords.has(word)) continue;

        if (firstName && firstName.length >= 3 && fuzzyWordScore(word, firstName) >= 80) {
          candidateMatches.push({
            student,
            score: 60,
            type: 'first',
            usedIndices: [i]
          });
        }

        if (lastName && lastName.length >= 4 && fuzzyWordScore(word, lastName) >= 80) {
          candidateMatches.push({
            student,
            score: 70,
            type: 'last',
            usedIndices: [i]
          });
        }
      }
    }

    // Skorlara göre sırala: En yüksek skorlu (tam isimler) en önde
    candidateMatches.sort((a, b) => b.score - a.score);

    const claimedWordIndices = new Set();

    for (const match of candidateMatches) {
      const isAlreadyClaimed = match.usedIndices.some(idx => claimedWordIndices.has(idx));
      if (!isAlreadyClaimed) {
        if (!matchedStudentsList.some(m => m.id === match.student.id)) {
          matchedStudentsList.push({
            id: match.student.id,
            name: match.student.fullName,
            class: match.student.class || ''
          });
          match.usedIndices.forEach(idx => claimedWordIndices.add(idx));
        }
      }
    }

    // D. Doğal Türkçe Kategori Belirleme
    let category = 'Girdi Çıktı';
    let isPositive = true;

    if (/\b(odev|sinav|not|test|soru|deneme|net|karne|ders|dersi|derste|matematik|fizik|kimya|biyoloji|turkce|tarih|cografya|kitap|okum|okudu|calis|calisti|teslim|akademik|paragraf|ezber|mufredat|performans|proje|derece|basari|kaynatti|dinlemedi)\b/i.test(cleanedInput)) {
      category = 'Akademik';
    } else if (/\b(dahil|dahili|dahiliders|ozelders|etut|birebir|sarf|nahiv|fikih|tefsir|hadis|kuran)\b/i.test(cleanedInput)) {
      category = 'Dahili Ders';
    } else if (/\b(namaz|namazda|namaza|yatsi|sabah|ogle|ikindi|aksam|girdi|cikti|cikis|giris|izin|carsi|evci|ayrildi|geldi|gitti|yurda|cemaat|vakit|mescit|cami|kapi|turnike|nobet)\b/i.test(cleanedInput)) {
      category = 'Girdi Çıktı';
    } else if (/\b(yoklama|tam|hepsi|burada|buradalar|eksiksiz|yemek|kahvalti|corba|yedi|icti|menu|tabak|katilim|yatakhane|oda)\b/i.test(cleanedInput)) {
      category = 'Yoklama';
    } else if (/\b(revir|hasta|hastalik|ilac|saglik|ates|doktor|doktora|agri|kusma|mide|halsiz|grip|serum|yaralan|pansuman|tansiyon|raporlu|sevk|hastane|acil)\b|\bbas agrisi\b|\bbas donmesi\b/i.test(cleanedInput)) {
      category = 'Sağlık';
    } else if (/\b(program|etkinlik|faaliyet|toplanti|seminer|sohbet|sinema|konferans|gezi|piknik|mac|turnuva|halisaha|tiyatro|munazara)\b/i.test(cleanedInput)) {
      category = 'Program';
    }

    // E. Doğal Türkçe Olumlu / Olumsuz Duygu Tespiti
    const cleanNoPositiveExceptions = cleanedInput
      .replace(/\beksiksiz\b/g, '')
      .replace(/\btam\b/g, '')
      .replace(/\btamkadro\b/g, '')
      .replace(/\bbasarili\b/g, '')
      .replace(/\bgayretli\b/g, '');

    if (/\b(katilmadi|yapmadi|gelmedi|etmedi|eksik|olmadi|basmadi|vermedi|gitmedi|uyumadi|uyudu|kalkmadi|kalkamadi|inmedi|inmemis|gec|gecikti|kacti|kacmis|olumsuz|disiplinsiz|kaynatti|dinlemedi|bahane|tartisti|kavga|sikayet|rahatsiz|yoktu|bulunmadi|asdi|ihmal)\b/i.test(cleanNoPositiveExceptions)) {
      isPositive = false;
    }

    const extractedText = stripStudentNames(text, matchedStudentsList, matchedGroupNames, matchedClassName);
    const firstMatch = matchedStudentsList[0] || null;

    const responseData = {
      matchedStudents: matchedStudentsList,
      matchedStudentId: firstMatch ? firstMatch.id : null,
      matchedStudentName: firstMatch ? firstMatch.name : null,
      matchedGroupName: matchedGroupNames[0] || null,
      matchedClassName: matchedClassName || null,
      confidence: matchedStudentsList.length > 0 ? 0.95 : 0.40,
      extractedText: extractedText,
      category: category,
      isPositive: isPositive,
      rawInput: text
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error("AI Parser Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
