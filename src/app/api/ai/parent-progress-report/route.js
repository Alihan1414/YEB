import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

function generateHumanFallback({ studentName, className, institutionName, periodText, reports = [], teacherName }) {
  const inst = institutionName || 'Bolu Kılıçarslan';
  const sender = teacherName || inst;
  const name = studentName || 'Öğrencimiz';
  const classText = className ? ` (${className} sınıfı)` : '';

  const namazReports = (reports || []).filter(r => (r.category || '').toLowerCase() === 'namaz');
  const akademikReports = (reports || []).filter(r => (r.category || '').toLowerCase() === 'akademik');
  const dikkatReports = (reports || []).filter(r => r.is_positive === false);
  const positiveReports = (reports || []).filter(r => r.is_positive !== false);

  const intro = `Kıymetli Velimiz, hayırlı günler dilerim. 🌿\n\n${inst} olarak öğrencimiz ${name}${classText}'ın son ${periodText || 'bir hafta'} boyunca gösterdiği gelişim, gayret ve genel durumunu sizinle paylaşmak istedim.`;

  let sections = [];

  // 1. Namaz & İbadet
  if (namazReports.length > 0) {
    const latest = namazReports[0]?.content ? ` ("${namazReports[0].content}")` : '';
    const hasIssue = namazReports.some(r => r.is_positive === false);
    if (hasIssue) {
      sections.push(`🤲 *İbadet ve Namaz Takibi:*\nNamaz programına katılımını teşvikle takip ediyoruz. Ev ortamında da bu konuda destek ve hatırlatmalarınız öğrencimize büyük güç katacaktır.${latest}`);
    } else {
      sections.push(`🤲 *İbadet ve Namaz Takibi:*\nVakit namazlarına cemaatle katılımı, edebi ve hassasiyeti bizleri ziyadesiyle memnun etmektedir.${latest}`);
    }
  }

  // 2. Dersler ve Akademik Durum
  if (akademikReports.length > 0) {
    const latest = akademikReports[0]?.content ? ` ("${akademikReports[0].content}")` : '';
    const hasIssue = akademikReports.some(r => r.is_positive === false);
    if (hasIssue) {
      sections.push(`📚 *Ders ve Etüt Durumu:*\nDerslerindeki gayretini artırmak için birlikte motive ediyoruz.${latest}`);
    } else {
      sections.push(`📚 *Ders ve Etüt Durumu:*\nEtütlerdeki çalışma disiplini, ders içi dikkati ve gayreti gayet güzel bir seyir izlemektedir.${latest}`);
    }
  }

  // 3. Diğer Değerlendirmeler / Genel Notlar
  const otherNotes = (reports || []).filter(r => {
    const cat = (r.category || '').toLowerCase();
    return cat !== 'namaz' && cat !== 'akademik';
  });

  if (otherNotes.length > 0) {
    const note = otherNotes[0];
    const catTitle = note.category ? `${note.category} Takibi` : 'Genel Gözlem';
    sections.push(`📌 *${catTitle}:*\n"${note.content}"`);
  }

  // 4. Dikkat Çekilen Hususlar (Varsa nazik pedagojik üslup)
  if (dikkatReports.length > 0) {
    const sample = dikkatReports.map(r => r.content).filter(Boolean).slice(0, 2).join(' / ');
    sections.push(`🌱 *Birlikte Takip Edeceğimiz Hususlar:*\nÖğrencimizin daha da iyi bir noktaya gelmesi adına evde de şu konularda (${sample}) karşılıklı takip ve motivasyon sağlamamız faydalı olacaktır.`);
  }

  // Rapor yoksa doğal durum
  let bodyContent = '';
  if (sections.length > 0) {
    bodyContent = sections.join('\n\n');
  } else {
    bodyContent = `Öğrencimiz derslerine, etütlerine ve kurum programımıza düzenli şekilde devam etmekte; arkadaşları ve öğretmenleriyle saygılı, olumlu bir iletişim sürdürmektedir. Bu dönemde tarafımıza yansıyan herhangi bir olumsuz durum bulunmamaktadır.`;
  }

  const closing = `Öğrencimizin başarısının ve güzel ahlakının daim olması adına emek ve dualarımızla yanındayız. Evdeki kıymetli ilginiz, nezaketiniz ve desteğiniz için gönülden teşekkür ederiz.\n\nSelam ve hürmetlerimizle,\n${sender}`;

  return `${intro}\n\n${bodyContent}\n\n${closing}`;
}

export async function POST(req) {
  let bodyData = {};
  try {
    bodyData = await req.json();
  } catch (err) {
    console.error('Request json parse error:', err);
  }

  const {
    studentName = 'Öğrencimiz',
    className = '',
    institutionName = 'Bolu Kılıçarslan',
    period = 'haftalik', // 'haftalik' | 'aylik' | 'genel'
    reports = [],
    teacherName = ''
  } = bodyData;

  const periodText = period === 'aylik' ? 'bir ay' : period === 'genel' ? 'bu dönem' : 'bir hafta';
  const periodName = period === 'aylik' ? 'aylık' : period === 'genel' ? 'dönemlik' : 'haftalık';

  // Fallback metni hazırla
  const fallbackText = generateHumanFallback({
    studentName,
    className,
    institutionName,
    periodText,
    reports,
    teacherName
  });

  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || geminiKey.trim() === '') {
    return NextResponse.json({
      success: true,
      message: fallbackText,
      isFallback: true
    });
  }

  try {
    // Rapor özetini hazırla
    const reportSummaries = (reports || []).slice(0, 15).map((r, i) => {
      const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('tr-TR') : '';
      return `${i + 1}. [${dateStr} - ${r.category || 'Genel'}]: ${r.content} (${r.is_positive === false ? 'Geliştirilmeli / Dikkat' : 'Olumlu / Başarılı'})`;
    }).join('\n');

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Sen Türkiye'de saygın bir eğitim kurumunda (${institutionName}) görev yapan, öğrencisini yakından tanıyan, şefkatli, pedagojik, nezaketli ve tecrübeli bir sınıf öğretmenisin / hocasısın.

GÖREV:
Aşağıdaki gerçek öğrenci kayıtlarına dayanarak, öğrencimiz "${studentName}" (${className ? className + ' sınıfı' : ''}) için velisine WhatsApp üzerinden doğrudan gönderilmek üzere "İNSAN YAZMIŞ GİBİ", sıcak, samimi, saygılı bir ${periodName} durum ve gelişim bilgilendirme mesajı hazırla.

ÖĞRENCİNİN SON DÖNEM RAPORLARI VE NOTLARI:
${reportSummaries || 'Bu dönem için sisteme girilmiş özel bir olumsuz not bulunmamaktadır, öğrenci derslerine ve programına düzenli devam etmiştir.'}

DİKKAT EDİLECEK KRİTİK KURALLAR:
1. KESİNLİKLE YAPAY ZEKA GİBİ KONUŞMA! "Sistem analizi", "Verilere göre", "Yapay zeka değerlendirmesi" gibi mekanik veya soğuk ifadeler ASLA yer almamalıdır.
2. Sanki öğretmeni o an telefonunu eline alıp veliye içtenlikle yazıyormuş gibi doğal ve samimi olmalıdır.
3. Hitap: "Kıymetli Velimiz, hayırlı günler dilerim. 🌿" tarzında sıcak ve saygılı olmalı.
4. İçerik:
   - Öğrencinin ibadet/namaz devamlılığı, ahlaki duruşu, derslerdeki dikkati ve gayreti hakkında gerçek notlara değin.
   - Varsa güzel yönlerini takdir et, veliyi gururlandır.
   - Eğer geliştirilmesi gereken bir yön veya olumsuz bir not varsa, bunu veliyi telaşlandırmadan, yapıcı bir dille ("Evde de birlikte motive edersek çok daha iyi olacaktır...") aktar.
5. Kapanış: Öğrencinin gayretinden memnun olunduğunu belirten, velinin desteği ve dualarına teşekkür eden samimi bir kapanış ve imza (${teacherName ? teacherName : institutionName}) ekle.
6. WhatsApp formatına uygun olarak paragraflar arasında birer boş satır bırak, gereksiz süslemeler yapma, ölçülü ve zarif birkaç emoji kullanabilirsin (🌱, 📚, 🤲 gibi).
7. Sadece veliye gönderilecek mesaj metnini yaz, başka hiçbir açıklama veya ön yazı ekleme.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return NextResponse.json({
      success: true,
      message: text || fallbackText
    });

  } catch (err) {
    console.error('Parent progress report AI error:', err);
    return NextResponse.json({
      success: true,
      message: fallbackText,
      isFallback: true
    });
  }
}
