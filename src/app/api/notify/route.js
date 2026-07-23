import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req) {
  try {
    const { parentPhone, studentName, reportText, category } = await req.json();

    if (!parentPhone || !studentName || !reportText) {
      return NextResponse.json({ success: false, error: 'Telefon, öğrenci adı ve rapor içeriği gereklidir.' }, { status: 400 });
    }

    console.log(`[Notification Sim] WhatsApp/SMS to parent phone ${parentPhone} for student ${studentName}: "${reportText}" (${category})`);
    return NextResponse.json({ success: true, message: 'Bildirim başarıyla kaydedildi/simüle edildi.' });
  } catch (error) {
    console.error("Notify API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
