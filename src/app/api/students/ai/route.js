import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readDb } from '@/lib/db';

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
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Rapor metninden öğrenci isimlerini ve Türkçe eklerini temizleyerek sadece faaliyeti bırakan yardımcı fonksiyon
function stripStudentNames(text, matchedStudents = []) {
  if (!text) return '';
  let cleaned = text;

  // Türkçe çekim ekleri (iyelik, yönelme, belirtme, ayrılma vb.)
  // 'ı, 'i, 'u, 'ü, 'e, 'a, 'in, 'ın, 'un, 'ün, 'den, 'dan, 'ten, 'tan, -ı, -i vb.
  const trSuffixRegex = `(?:['’\\-](?:[ıieeaouü][nmst]?|[ıieeaouü]n[ıieeaouü]?|[dt][ae]n|[y][ıieeaouü])|in|ın|un|ün|e|a|i|ı|u|ü|ye|ya|yi|yı|yu|yü|den|dan|ten|tan|de|da|te|ta)?`;

  matchedStudents.forEach(st => {
    const rawName = st.name || '';
    const parts = rawName.split(/\s+/).filter(p => p && p.length >= 2);
    
    // Önce tam adı ekleriyle temizle
    if (rawName.trim().length >= 3) {
      const escapedFull = rawName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`\\b${escapedFull}${trSuffixRegex}\\b`, 'gi'), ' ');
    }
    
    // Sonra tekil parçaları (soyadı veya adı) ekleriyle temizle
    parts.forEach(p => {
      const escapedPart = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`\\b${escapedPart}${trSuffixRegex}\\b`, 'gi'), ' ');
      // Tire veya kesme ile ayrılmış halleri de (örn: Divan-ı, Divanlı'ya)
      cleaned = cleaned.replace(new RegExp(`\\b${escapedPart}[\\-–—'’][a-zA-ZçğıöşüÇĞİÖŞÜ]+\\b`, 'gi'), ' ');
    });
  });

  // "adlı öğrenciler", "ve", "ile", vb. kelimeleri ve baştaki noktalama işaretlerini temizle
  cleaned = cleaned
    .replace(/\b(adlı|isimli|olan|adlarındaki|isimlerindeki)\s+(öğrenciler|öğrencileri|talebeler|talebeleri|arkadaşlar|öğrenci|talebe)\b/gi, ' ')
    .replace(/\b(öğrenciler|öğrencileri|talebeler|talebeleri)\b/gi, ' ')
    .replace(/^[\s,;:\-–—\.\/\\&]+/, '')
    .replace(/^\s*(ve|ile|de|da|dahi)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
  }

  return cleaned || text.trim();
}

export async function POST(req) {
  try {
    const { text, institutionId = 'yamanevler', students: clientStudents } = await req.json();
    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: 'Metin girişi zorunludur.' }, { status: 400 });
    }

    const normInstId = (institutionId || 'yamanevler').trim().toLowerCase();

    // 1. Get current students (Combining Client Passed + Firestore + Local DB for absolute complete list)
    const studentMap = new Map();

    // A. Add client passed students directly if present
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

    // B. Fetch Local DB students
    try {
      const dbData = readDb();
      (dbData.students || []).forEach(s => {
        const sInst = (s.institution_id || 'yamanevler').trim().toLowerCase();
        if (sInst === normInstId) {
          const fullName = `${s.name || ''} ${s.surname || ''}`.trim();
          studentMap.set(s.id, {
            id: s.id,
            fullName,
            class: s.class || ''
          });
        }
      });
    } catch (e) {
      console.warn("AI Local DB fetch warning:", e.message);
    }

    // B. Fetch Firestore students and merge
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'vision-b1ad5';
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCH7bTzvqJqSzJiV0Ou6JudPovkrrWrwdw';
      if (projectId && apiKey) {
        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}&pageSize=1000`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.documents) {
          data.documents.forEach(doc => {
            const fields = doc.fields || {};
            const docInst = (fields.institution_id?.stringValue || 'yamanevler').trim().toLowerCase();
            if (docInst === normInstId) {
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
    } catch (e) {
      console.warn("AI Firestore student fetch warning:", e.message);
    }

    const students = Array.from(studentMap.values());

    const geminiKey = process.env.GEMINI_API_KEY;

    // 2. Try Gemini API first
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Sen bir okul ve yurt talebe takip uygulaması için akıllı bir asistansın. Görevin, Türkçe ses/metin rapor girişini analiz ederek bir veya birden fazla öğrenci için ortak veya tekil rapor oluşturmaktır.

Kayıtlı Öğrenciler (Sadece bu listeden eşleştirme yap):
${JSON.stringify(students, null, 2)}

Geçerli Kategoriler (YALNIZCA şu 6 kategoriden birini seç):
"Akademik", "Yemek", "Program", "Sağlık", "Namaz", "Dahili"

Önemli Kategori Örnekleri:
- Ödev yapma, ödev teslimi, sınav sonucu, test/soru çözümü, derse katılım, ders çalışması, kitap okuması -> Kategori: "Akademik"
- Yemek yeme, öğle yemeği, kahvaltı, çorba, yemeğe katıldı/katılmadı -> Kategori: "Yemek"
- Namaz kılma, sabah/öğle/ikindi/akşam/yatsı namazı, cemaat, tesbihat -> Kategori: "Namaz"
- Hastalık, revir, ilaç, baş ağrısı, doktor, ateş -> Kategori: "Sağlık"
- Etkinlik, sohbet, seminer, toplu faaliyet, ders programı -> Kategori: "Program"
- Kurum içi dahili konular, idari notlar, diğer konular -> Kategori: "Dahili"

Kurallar:
1. Öğrenci Eşleştirme (Çoklu veya Tekli): Girişte geçen isim veya isimleri listedeki öğrencilerle esnek bir şekilde (Türkçe karakter uyuşmazlığı "ergon" -> "Ergön" veya konuşma-metin ses dönüşüm hataları dahil) en doğru şekilde eşleştir. Eğer 1'den fazla öğrencinin adı geçiyorsa (örneğin "Ali, Ahmet, Mehmet ve Burak etüde katıldı"), geçen TÜM öğrencileri "matchedStudents" dizisine ekle.
2. matchedStudents: Her biri { "id": "student-id", "name": "Öğrenci Adı Soyadı", "class": "Sınıfı" } objesi içeren dizi.
3. Rapor Metni (ÖNEMLİ KURAL): Rapor içeriğinde KESİNLİKLE öğrenci isimleri yer almamalıdır! Sadece gerçekleştirilen faaliyet, eylem veya durum yazılmalıdır ("ali, ahmet, mehmet ödevlerini teslim etti" -> "Ödevlerini teslim etti."). Öğrencilerin isimleri bireysel veya toplu raporda asla metin içine yazılmamalı, çünkü her öğrencinin kendi raporunda diğer öğrencilerin isimlerinin gözükmesi istenmez!
4. Kategori: Rapor içeriğine en uygun kategoriyi belirle.
5. isPositive: Rapor olumlu bir davranış/durum içeriyorsa true, olumsuzsa false.
6. Güven Skoru: 0.0 ile 1.0 arasında güven skoru ver.

SADECE geçerli şu JSON formatında yanıt ver:
{
  "matchedStudents": [
    { "id": "student-id", "name": "Öğrenci Adı Soyadı", "class": "Sınıfı" }
  ],
  "matchedStudentId": "ilk öğrencinin id'si veya null",
  "matchedStudentName": "ilk öğrencinin adı veya null",
  "confidence": 0.95,
  "extractedText": "Öğrenci isimleri İÇERMEYEN temiz Türkçe faaliyet/eylem metni",
  "category": "Akademik",
  "isPositive": true,
  "rawInput": "${text.replace(/"/g, '\\"')}"
}`;

        const result = await model.generateContent(prompt);
        const resultText = result.response.text().trim();
        const cleanedText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        // Ensure category is strictly valid
        const validCategories = ['Akademik', 'Yemek', 'Program', 'Sağlık', 'Namaz', 'Dahili'];
        if (!validCategories.includes(parsed.category)) {
          parsed.category = 'Dahili';
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

        // Always strip student names from extractedText to guarantee clean action text
        parsed.extractedText = stripStudentNames(parsed.extractedText, parsed.matchedStudents);

        return NextResponse.json({ success: true, data: parsed });
      } catch (err) {
        console.warn("Gemini execution failed, falling back to local matcher:", err);
      }
    }

    // 3. Robust Local Fallback Matcher (Ranked Scoring & Disambiguation)
    const cleanedInput = trClean(text);
    const scoredStudents = [];

    for (const student of students) {
      const cleanedFullName = trClean(student.fullName);
      const nameParts = cleanedFullName.split(' ').filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      let score = 0;
      let matchType = 'none';

      // 1. Tam İsim Birebir veya Ekli Kontrolü (örn: "Alihan Divanlı", "Alihan Divan")
      if (cleanedFullName && cleanedFullName.length >= 3) {
        if (cleanedInput.includes(cleanedFullName)) {
          score = 100;
          matchType = 'full_exact';
        } else if (lastName && lastName.length >= 3) {
          // Soyadının kökü ve adın birlikte geçmesi (örn: "alihan divan" metinde "alihan divanlı" veya "alihan divan-ı")
          const lastNameStem = lastName.slice(0, Math.max(3, lastName.length - 2));
          if (cleanedInput.includes(firstName) && cleanedInput.includes(lastNameStem)) {
            score = 90;
            matchType = 'full_stem';
          }
        }
      }

      // 2. Yalnızca Soyisim Kontrolü (Nadir ve ayırt edici soyadlar için)
      if (score === 0 && lastName && lastName.length >= 4) {
        const lastNameStem = lastName.slice(0, Math.max(3, lastName.length - 2));
        const regexLast = new RegExp(`\\b${lastNameStem}`, 'i');
        if (regexLast.test(cleanedInput)) {
          score = 70;
          matchType = 'last_only';
        }
      }

      // 3. Yalnızca İsim Kontrolü (En düşük öncelik: min 3 karakter)
      if (score === 0 && firstName && firstName.length >= 3) {
        const regexFirst = new RegExp(`\\b${firstName}\\b`, 'i');
        if (regexFirst.test(cleanedInput)) {
          score = 40;
          matchType = 'first_only';
        }
      }

      if (score > 0) {
        scoredStudents.push({
          student,
          score,
          matchType,
          firstName,
          lastName
        });
      }
    }

    // DISAMBIGUATION:
    // Eğer bir öğrenci tam isimle (score >= 90) eşleştiyse (örn: "Alihan Divanlı"),
    // sadece ilk adı aynı olan diğer öğrencileri (örn: "Alihan Karakoç") hariç tut!
    const hasHighScore = scoredStudents.some(s => s.score >= 90);
    let finalFilteredScored = scoredStudents;

    if (hasHighScore) {
      const highScoredFirstNames = new Set(
        scoredStudents.filter(s => s.score >= 90).map(s => s.firstName)
      );

      finalFilteredScored = scoredStudents.filter(s => {
        // Skoru 90 ve üzeri ise kesin al
        if (s.score >= 90) return true;
        // Eğer skoru düşükse ve ilk adı yüksek skorlu biriyle çakışıyorsa VE soyadı metinde geçmiyorsa ELE!
        if (highScoredFirstNames.has(s.firstName)) {
          return false;
        }
        return true;
      });
    }

    // Skoruna göre sırala
    finalFilteredScored.sort((a, b) => b.score - a.score);

    const matchedStudentsList = [];
    for (const item of finalFilteredScored) {
      if (!matchedStudentsList.some(m => m.id === item.student.id)) {
        matchedStudentsList.push({
          id: item.student.id,
          name: item.student.fullName,
          class: item.student.class || ''
        });
      }
    }

    // Determine category via keyword analysis
    let category = 'Dahili';
    let isPositive = true;
    if (/(odev|sinav|not|test|soru|deneme|karne|matematik|fizik|kimya|biyoloji|turkce|tarih|cografya|kitap|okum|calis|teslim|akademik|derse|dersini|ders)/i.test(cleanedInput)) {
      category = 'Akademik';
    } else if (/(namaz|sabah|ogle|ikindi|aksam|yatsi|cami|cemaat|tesbih|kild)/i.test(cleanedInput)) {
      category = 'Namaz';
    } else if (/(yemek|kahvalti|corba|yedi|icti|menu|tabak)/i.test(cleanedInput)) {
      category = 'Yemek';
    } else if (/(bas|revir|hasta|ilac|saglik|ates|doktor|agri|kusma|mide|halsiz)/i.test(cleanedInput)) {
      category = 'Sağlık';
    } else if (/(program|etkinlik|faaliyet|toplanti|seminer|sohbet|kuran)/i.test(cleanedInput)) {
      category = 'Program';
    }
    
    if (/(katilmadi|yapmadi|gelmedi|etmedi|eksik|olmadi|basmadi|vermedi|gitmedi|uyumadi|kalkmadi)/i.test(cleanedInput)) {
      isPositive = false;
    }

    // Strip student names in fallback too
    const extractedText = stripStudentNames(text, matchedStudentsList);

    const firstMatch = matchedStudentsList[0] || null;

    const fallbackResponse = {
      matchedStudents: matchedStudentsList,
      matchedStudentId: firstMatch ? firstMatch.id : null,
      matchedStudentName: firstMatch ? firstMatch.name : null,
      confidence: matchedStudentsList.length > 0 ? 0.90 : 0.40,
      extractedText: extractedText,
      category: category,
      isPositive: isPositive,
      rawInput: text
    };

    return NextResponse.json({ success: true, data: fallbackResponse });

  } catch (error) {
    console.error("AI Parser Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

