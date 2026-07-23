import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';


export async function POST(req) {
  try {
    const { text, institutionId = 'yamanevler' } = await req.json();
    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: 'Metin girişi zorunludur.' }, { status: 400 });
    }

    // 1. Get current students (with local DB fallback)
    let students = [];
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
          students = data.documents
            .filter(doc => {
              const f = doc.fields || {};
              return (f.institution_id?.stringValue || 'yamanevler') === institutionId;
            })
            .map(doc => {
              const fields = doc.fields || {};
              return {
                id: doc.name.split('/').pop(),
                fullName: `${fields.name?.stringValue || ''} ${fields.surname?.stringValue || ''}`.trim(),
                class: fields.class?.stringValue || ''
              };
            });
        }
      }
    } catch (e) {
      console.error("AI student fetch error:", e);
    }

    if (students.length === 0) {
      const { readDb } = await import('@/lib/db');
      const dbData = readDb();
      students = (dbData.students || [])
        .filter(s => (s.institution_id || 'yamanevler') === institutionId)
        .map(s => ({
          id: s.id,
          fullName: `${s.name} ${s.surname}`.trim(),
          class: s.class || ''
        }));
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    // A. If Gemini Key is present, try Google Generative AI
    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
Sen bir okul öğrenci takip uygulaması için akıllı bir asistansın. Görevin, Türkçe doğal dil girişini analiz ederek öğrenci raporu oluşturmaktır.

Kayıtlı öğrenciler:
${JSON.stringify(students, null, 2)}

Kategoriler: "Akademik", "Yemek", "Sağlık", "Davranış", "Diğer"

Yapman gerekenler:
1. Girişte geçen öğrenci adını/soyadını listedeki öğrencilerle eşleştir (yakın eşleşme yap).
2. Eşleşen öğrencinin ID'sini "matchedStudentId" olarak, tam adını "matchedStudentName" olarak döndür. Eşleşme yoksa null.
3. Rapor metnini profesyonel ve kısa bir şekilde temizle (örneğin "öğle yemeğine gelmedi, rapora gir" yerine "Öğle yemeğine katılmadı.").
4. Kategoriyi belirle.
5. 0.0-1.0 arasında güven skoru ver.

SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma:
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
        return NextResponse.json({ success: true, data: parsed });
      } catch (err) {
        console.warn("Gemini execution failed, falling back to regex parser:", err);
      }
    }

    // B. Local Fallback/Regex Parser when Gemini key is not configured or rate-limited
    let matchedStudent = null;
    const lowerInput = text.toLowerCase();

    for (const student of students) {
      const nameParts = student.fullName.toLowerCase().split(' ');
      // Check if all or most name parts are present in the text input
      const matchCount = nameParts.filter(part => lowerInput.includes(part)).length;
      if (matchCount > 0 && matchCount === nameParts.length) {
        matchedStudent = student;
        break;
      }
    }

    // If not exact matching, look for single first name matching
    if (!matchedStudent) {
      for (const student of students) {
        const firstName = student.fullName.split(' ')[0].toLowerCase();
        if (firstName.length > 2 && lowerInput.includes(firstName)) {
          matchedStudent = student;
          break;
        }
      }
    }

    // Determine category
    let category = 'Diğer';
    if (lowerInput.includes('yemek') || lowerInput.includes('öğle') || lowerInput.includes('kahvaltı') || lowerInput.includes('çorba')) {
      category = 'Yemek';
    } else if (lowerInput.includes('namaz') || lowerInput.includes('program') || lowerInput.includes('etkinlik') || lowerInput.includes('ders')) {
      category = 'Program';
    } else if (lowerInput.includes('başım') || lowerInput.includes('revir') || lowerInput.includes('hasta') || lowerInput.includes('ilaç') || lowerInput.includes('sağlık')) {
      category = 'Sağlık';
    } else if (lowerInput.includes('akademik') || lowerInput.includes('sınav') || lowerInput.includes('not') || lowerInput.includes('ödev')) {
      category = 'Akademik';
    }

    // Clean up text text output
    let extractedText = text;
    // Capitalize first letter
    if (extractedText.length > 0) {
      extractedText = extractedText.charAt(0).toUpperCase() + extractedText.slice(1);
    }

    const fallbackResponse = {
      matchedStudentId: matchedStudent ? matchedStudent.id : null,
      matchedStudentName: matchedStudent ? matchedStudent.fullName : null,
      confidence: matchedStudent ? 0.90 : 0.50,
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
