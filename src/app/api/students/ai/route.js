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

export async function POST(req) {
  try {
    const { text, institutionId = 'yamanevler' } = await req.json();
    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: 'Metin girişi zorunludur.' }, { status: 400 });
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
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (projectId && apiKey) {
        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students?key=${apiKey}`,
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
Sen bir okul öğrenci takip uygulaması için akıllı bir asistansın. Görevin, Türkçe ses/metin rapor girişini analiz ederek öğrenci raporu oluşturmaktır.

Kayıtlı Öğrenciler (Sadece bu listeden eşleştirme yap):
${JSON.stringify(students, null, 2)}

Geçerli Kategoriler (YALNIZCA şu 6 kategoriden birini seç):
"Akademik", "Yemek", "Program", "Sağlık", "Namaz", "Diğer"

Önemli Kategori Örnekleri:
- Ödev yapma, ödev teslimi, sınav sonucu, test/soru çözümü, derse katılım, ders çalışması, kitap okuması -> Kategori: "Akademik"
- Yemek yeme, öğle yemeği, kahvaltı, çorba, yemeğe katıldı/katılmadı -> Kategori: "Yemek"
- Namaz kılma, sabah/öğle/ikindi/akşam/yatsı namazı, cemaat, tesbihat -> Kategori: "Namaz"
- Hastalık, revir, ilaç, baş ağrısı, doktor, ateş -> Kategori: "Sağlık"
- Etkinlik, sohbet, seminer, toplu faaliyet, ders programı -> Kategori: "Program"

Kurallar:
1. Öğrenci Adı Eşleştirme: Girişte geçen ismi listedeki öğrencilerle esnek bir şekilde (Türkçe karakter uyuşmazlığı "ergon" -> "Ergön" veya konuşma-metin ses dönüşüm hataları dahil) en doğru şekilde eşleştir.
2. Eşleşen öğrencinin ID'sini "matchedStudentId" olarak, tam adını "matchedStudentName" olarak döndür. Listedeki hiç kimseyle eşleşmezse null ver.
3. Rapor Metni: Rapor içeriğini dilbilgisine uygun, temiz ve profesyonel Türkçe ile düzelt ("ali ödevlerini teslim etti kaydet" -> "Ödevlerini teslim etti.").
4. Kategori: Rapor içeriğine en uygun kategoriyi yukarıdaki örnekler doğrultusunda belirle.
5. Güven Skoru: 0.0 ile 1.0 arasında güven skoru ver.

SADECE geçerli şu JSON formatında yanıt ver:
{
  "matchedStudentId": "student-id veya null",
  "matchedStudentName": "tam ad veya null",
  "confidence": 0.95,
  "extractedText": "Temizlenmiş Türkçe rapor metni",
  "category": "Kategori",
  "rawInput": "${text.replace(/"/g, '\\"')}"
}`;

        const result = await model.generateContent(prompt);
        const resultText = result.response.text().trim();
        const cleanedText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanedText);
        
        // Ensure category is strictly valid
        const validCategories = ['Akademik', 'Yemek', 'Program', 'Sağlık', 'Namaz', 'Diğer'];
        if (!validCategories.includes(parsed.category)) {
          parsed.category = 'Diğer';
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
    let category = 'Diğer';
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
