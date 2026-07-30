import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionId = (searchParams.get('institutionId') || 'yamanevler').trim().toLowerCase();

    const dbData = readDb();
    if (!dbData.announcements) dbData.announcements = {};

    const announcements = dbData.announcements[institutionId] || [
      "📢 ÖNEMLİ DUYURU: Bu hafta dereceye giren sınıflar ve haftalık performans puanları canlı olarak panoda ilan edilmektedir.",
      "🔔 İZİN BİLGİLENDİRMESİ: Öğrenci izin başvuruları veliler tarafından doğrudan dijital form üzerinden iletilebilir.",
      "⭐ AKADEMİK & NAMAZ TAKİBİ: Günlük raporlar öğretmenlerimiz tarafından anlık işlenmekte ve veli bilgilendirme sistemiyle paylaşılmaktadır.",
      "🏆 TEBRİKLER: Tüm öğrencilerimize derslerinde ve haftalık çalışmalarda üstün başarılar dileriz."
    ];

    return NextResponse.json({ success: true, announcements });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { institutionId = 'yamanevler', announcements } = await req.json();
    if (!Array.isArray(announcements)) {
      return NextResponse.json({ success: false, error: 'Duyuru listesi gerekli.' }, { status: 400 });
    }

    const instId = institutionId.trim().toLowerCase();
    const dbData = readDb();
    if (!dbData.announcements) dbData.announcements = {};

    dbData.announcements[instId] = announcements.filter(a => typeof a === 'string' && a.trim().length > 0);
    writeDb(dbData);

    return NextResponse.json({ success: true, announcements: dbData.announcements[instId] });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
