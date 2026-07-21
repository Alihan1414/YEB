import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req) {
  try {
    const { parentEmail, studentName, reportText, category } = await req.json();

    if (!parentEmail || !studentName || !reportText) {
      return NextResponse.json({ success: false, error: 'E-posta, öğrenci adı ve rapor içeriği gereklidir.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not configured. Simulating email send to:", parentEmail);
      return NextResponse.json({ success: true, warning: 'RESEND_API_KEY bulunamadı, gönderim simüle edildi.' });
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'Student Reports <onboarding@resend.dev>',
      to: [parentEmail],
      subject: `${studentName} - Günlük Öğrenci Rapor Bildirimi`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #fafafa;">
          <h2 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">Öğrenci Günlük Durum Bildirimi</h2>
          <p>Sayın Veli,</p>
          <p>Öğrencimiz <strong>${studentName}</strong> hakkında bugün girilen günlük rapor detayı aşağıda bilgilerinize sunulmuştur:</p>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; font-weight: bold; color: #8b5cf6;">Kategori: ${category}</p>
            <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">"${reportText}"</p>
          </div>
          <p style="font-size: 12px; color: #777; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 15px;">
            Bu e-posta otomatik olarak gönderilmiştir. Sorularınız için sınıf öğretmeni ile iletişime geçebilirsiniz.
          </p>
        </div>
      `
    });

    if (error) {
      console.error("Resend send error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Notify API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
