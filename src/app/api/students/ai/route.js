import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readDb } from '@/lib/db';

function trClean(str) {
  if (!str) return '';
  return str
    .replace(/Ä°/g, 'i')
    .replace(/I/g, 'Ä±')
    .toLowerCase()
    .replace(/Ã§/g, 'c')
    .replace(/ÄŸ/g, 'g')
    .replace(/Ä±/g, 'i')
    .replace(/Ã¶/g, 'o')
    .replace(/ÅŸ/g, 's')
    .replace(/Ã¼/g, 'u')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export async function POST(req) {
  try {
    const { text, institutionId = 'yamanevler' } = await req.json();
    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: 'Metin giriÅŸi zorunludur.' }, { status: 400 });
    }

    const normInstId = (institutionId || 'yamanevler').trim().toLowerCase();

    // 1. Get current students (Combining Firestore + Local DB for absolute complete list)
    const studentMap = new Map();

    // A. Fetch Local DB students first
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
Sen bir okul Ã¶ÄŸrenci takip uygulamasÄ± iÃ§in akÄ±llÄ± bir asistansÄ±n. GÃ¶revin, TÃ¼rkÃ§e ses/metin rapor giriÅŸini analiz ederek Ã¶ÄŸrenci raporu oluÅŸturmaktÄ±r.

KayÄ±tlÄ± Ã–ÄŸrenciler (Sadece bu listeden eÅŸleÅŸtirme yap):
${JSON.stringify(students, null, 2)}

GeÃ§erli Kategoriler (YALNIZCA ÅŸu 6 kategoriden birini seÃ§):
"Akademik", "Yemek", "Program", "SaÄŸlÄ±k", "Namaz", "DiÄŸer"

Ã–nemli Kategori Ã–rnekleri:
- Ã–dev yapma, Ã¶dev teslimi, sÄ±nav sonucu, test/soru Ã§Ã¶zÃ¼mÃ¼, derse katÄ±lÄ±m, ders Ã§alÄ±ÅŸmasÄ±, kitap okumasÄ± -> Kategori: "Akademik"
- Yemek yeme, Ã¶ÄŸle yemeÄŸi, kahvaltÄ±, Ã§orba, yemeÄŸe katÄ±ldÄ±/katÄ±lmadÄ± -> Kategori: "Yemek"
- Namaz kÄ±lma, sabah/Ã¶ÄŸle/ikindi/akÅŸam/yatsÄ± namazÄ±, cemaat, tesbihat -> Kategori: "Namaz"
- HastalÄ±k, revir, ilaÃ§, baÅŸ aÄŸrÄ±sÄ±, doktor, ateÅŸ -> Kategori: "SaÄŸlÄ±k"
- Etkinlik, sohbet, seminer, toplu faaliyet, ders programÄ± -> Kategori: "Program"

Kurallar:
1. Ã–ÄŸrenci AdÄ± EÅŸleÅŸtirme: GiriÅŸte geÃ§en ismi listedeki Ã¶ÄŸrencilerle esnek bir ÅŸekilde (TÃ¼rkÃ§e karakter uyuÅŸmazlÄ±ÄŸÄ± "ergon" -> "ErgÃ¶n" veya konuÅŸma-metin ses dÃ¶nÃ¼ÅŸÃ¼m hatalarÄ± dahil) en doÄŸru ÅŸekilde eÅŸleÅŸtir.
2. EÅŸleÅŸen Ã¶ÄŸrencinin ID'sini "matchedStudentId" olarak, tam adÄ±nÄ± "matchedStudentName" olarak dÃ¶ndÃ¼r. Listedeki hiÃ§ kimseyle eÅŸleÅŸmezse null ver.
3. Rapor Metni: Rapor iÃ§eriÄŸini dilbilgisine uygun, temiz ve profesyonel TÃ¼rkÃ§e ile dÃ¼zelt ("ali Ã¶devlerini teslim etti kaydet" -> "Ã–devlerini teslim etti.").
4. Kategori: Rapor iÃ§eriÄŸine en uygun kategoriyi yukarÄ±daki Ã¶rnekler doÄŸrultusunda belirle.
5. GÃ¼ven Skoru: 0.0 ile 1.0 arasÄ±nda gÃ¼ven skoru ver.

SADECE geÃ§erli ÅŸu JSON formatÄ±nda yanÄ±t ver:
{
  "matchedStudentId": "student-id veya null",
  "matchedStudentName": "tam ad veya null",
  "confidence": 0.95,
  "extractedText": "TemizlenmiÅŸ TÃ¼rkÃ§e rapor metni",
  "category": "Kategori",
  "rawInput": "${text.replace(/"/g, '\\"')}"
}`;

        const result = await model.generateContent(prompt);
        const resultText = result.response.text().trim();
        const cleanedText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        // Ensure category is strictly valid
        const validCategories = ['Akademik', 'Yemek', 'Program', 'SaÄŸlÄ±k', 'Namaz', 'DiÄŸer'];
        if (!validCategories.includes(parsed.category)) {
          parsed.category = 'DiÄŸer';
        }

        return NextResponse.json({ success: true, data: parsed });
      } catch (err) {
        console.warn("Gemini execution failed, falling back to local matcher:", err);
      }
    }

    // 3. Robust Local Fallback Matcher (Normalized & Fuzzy)
    const cleanedInput = trClean(text);
    let matchedStudent = null;
    let maxMatchScore = 0;

    for (const student of students) {
      const cleanedFullName = trClean(student.fullName);
      const nameParts = cleanedFullName.split(' ').filter(Boolean);

      // Check exact full name match or contained substring
      if (cleanedFullName && cleanedInput.includes(cleanedFullName)) {
        matchedStudent = student;
        maxMatchScore = 100;
        break;
      }

      // Check matching individual parts
      let matchedCount = 0;
      for (const part of nameParts) {
        if (part.length >= 2 && cleanedInput.includes(part)) {
          matchedCount++;
        }
      }

      const score = (matchedCount / nameParts.length) * 100;
      if (score > maxMatchScore && matchedCount > 0) {
        maxMatchScore = score;
        matchedStudent = student;
      }
    }

    // Determine category via keyword analysis (Order matters: Akademik high priority)
    let category = 'DiÄŸer';
    if (/(odev|sinav|not|test|soru|deneme|karne|matematik|fizik|kimya|biyoloji|turkce|tarih|cografya|kitap|okum|calis|teslim|akademik|derse|dersini|ders)/i.test(cleanedInput)) {
      category = 'Akademik';
    } else if (/(namaz|sabah|ogle|ikindi|aksam|yatsi|cami|cemaat|tesbih|kild)/i.test(cleanedInput)) {
      category = 'Namaz';
    } else if (/(yemek|kahvalti|corba|yedi|icti|menu|tabak)/i.test(cleanedInput)) {
      category = 'Yemek';
    } else if (/(bas|revir|hasta|ilac|saglik|ates|doktor|agri|kusma|mide|halsiz)/i.test(cleanedInput)) {
      category = 'SaÄŸlÄ±k';
    } else if (/(program|etkinlik|faaliyet|toplanti|seminer|sohbet|kuran)/i.test(cleanedInput)) {
      category = 'Program';
    }

    let extractedText = text.trim();
    if (extractedText.length > 0) {
      extractedText = extractedText.charAt(0).toUpperCase() + extractedText.slice(1);
    }

    const fallbackResponse = {
      matchedStudentId: matchedStudent ? matchedStudent.id : null,
      matchedStudentName: matchedStudent ? matchedStudent.fullName : null,
      confidence: matchedStudent ? (maxMatchScore >= 100 ? 0.95 : 0.85) : 0.40,
      extractedText: extractedText,
      category: category,
      rawInput: text
    };

    return NextResponse.json({ success: true, data: fallbackResponse });

  } catch (error) {
    console.error("AI Parser Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

