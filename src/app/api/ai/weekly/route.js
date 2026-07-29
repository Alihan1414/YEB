import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { stats, institutionName = 'Yamanevler Enderun Bilişim' } = await req.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.trim() === '') {
      return NextResponse.json({
        success: true,
        summary: `Bu hafta ${institutionName} bünyesinde toplam ${stats.weeklyReportsCount || 0} rapor girişi yapılmıştır. Akademik alanda ${stats.weeklyAkademikCount || 0} ve namaz takibinde ${stats.weeklyNamazCount || 0} kayıt oluşturulmuştur. Öğrencilerimizin gelişimini yakından takip etmeye devam ediyoruz.`
      });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Sen bir eğitim kurumu için yapay zeka asistanısın. Kurum adı: "${institutionName}".
Aşağıda bu haftaya ait öğrenci takip verileri bulunmaktadır:
- Toplam girilen rapor sayısı: ${stats.weeklyReportsCount || 0}
- Namaz kategorisindeki rapor sayısı: ${stats.weeklyNamazCount || 0}
- Akademik kategorisindeki rapor sayısı: ${stats.weeklyAkademikCount || 0}
- Haftanın en başarılı sınıfları sıralaması: ${JSON.stringify(stats.topClasses || [])}
- Haftanın en başarılı öğrencileri: ${JSON.stringify(stats.topStudents || [])}

Bu verilere dayanarak, velilere ve öğretmenlere hitaben yazılmış, pedagojik, teşvik edici, kurumsal ve nazik dilde 3-4 cümlelik Türkçe haftalık genel bir değerlendirme raporu oluştur. Raporu doğrudan paylaşılabilir bir paragraf halinde ver, başka hiçbir giriş veya açıklama yazma.
`;

    const result = await model.generateContent(prompt);
    const resultText = result.response.text().trim();

    return NextResponse.json({ success: true, summary: resultText });

  } catch (error) {
    console.error("AI Weekly Summary Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      summary: "Haftalık değerlendirme raporu oluşturulurken bir hata meydana geldi."
    }, { status: 500 });
  }
}
