import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readDb } from '@/lib/db';

export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text || text.trim() === '') {
      return NextResponse.json({ success: false, error: 'Metin girişi zorunludur.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY yapılandırılmamış.' }, { status: 500 });
    }

    const db = readDb();
    const students = db.students.map(s => ({
      id: s.id,
      fullName: `${s.name} ${s.surname}`.trim(),
      class: s.class
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
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

    // Strip markdown code blocks if present
    const cleanedText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("AI Parser Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
