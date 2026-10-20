import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { stats, institutionName = 'Bolu Kılıçarslan Yurdu' } = await req.json();

    const topGrp = stats?.topGroups?.[0];
    const topCls = stats?.topClasses?.[0];
    const topStList = (stats?.topStudents || []).slice(0, 5).map(s => `${s.name} (${s.groupName || s.class || ''})`).join(', ');
    const supportList = (stats?.studentsNeedingSupport || []).slice(0, 5).map(s => `${s.name} (${s.lastNote || 'Takip'})`).join(', ');
    const categoryCounts = stats?.categoryCounts || {};

    if (!stats || (stats.weeklyReportsCount || 0) === 0) {
      return NextResponse.json({
        success: true,
        summary: `**${institutionName.toUpperCase()} HAFTALIK İDARE VE GELİŞİM RAPORU**\n\nBu hafta henüz sisteme kaydedilmiş herhangi bir faaliyet, yoklama veya ders raporu bulunmamaktadır.\n\nÖğretmenlerimiz ve belleticilerimiz günlük raporları girdikçe kurum verimliliği, öğretmen grubu (Çetinkaya, Aldemir, Mısırlı, Güney, Yerlikaya, Kalkan, Zauzı, Kaşıtoğlu) ve talebe başarı sıralamaları ve haftalık kurumsal idare analizi burada gerçek verilere dayalı olarak otomatik olarak oluşturulacaktır.`
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.trim() === '') {
      const defaultSummary = `
**${institutionName.toUpperCase()} HAFTALIK KURUMSAL İDARE VE GELİŞİM RAPORU**

Hafta boyunca kurumumuzda talebelerimizin akademik, ahlaki ve sosyal gelişimleri idari kadromuz ve belleticilerimizce titizlikle takip edilmiştir. Bu süreçte sisteme toplam **${stats.weeklyReportsCount || 0}** adet faaliyet ve durum kaydı girilmiş, genel başarı/verimlilik oranı **%${stats.overallEfficiency || 0}** olarak gerçekleşmiştir.

**1. Kategorik Dağılım ve Faaliyet İcmali:**
- **Yoklama & İştirak:** ${categoryCounts['Yoklama'] || stats.weeklyYoklamaCount || 0} kayıt (Kurum içi düzenli katılım)
- **Akademik Çalışmalar:** ${categoryCounts['Akademik'] || stats.weeklyAkademikCount || 0} kayıt (Ödev, test, sınav ve kitap okuma)
- **Dahili Ders & Özel Etüt:** ${categoryCounts['Dahili Ders'] || stats.weeklyDahiliCount || 0} kayıt (Müfredat ve takviye dersler)
- **Program & Manevi Faaliyetler:** ${categoryCounts['Program'] || 0} kayıt
- **Girdi - Çıktı & Vakit Disiplini:** ${categoryCounts['Girdi Çıktı'] || 0} kayıt (Namaz ve izin takibi)
- **Sağlık & Revir Kayıtları:** ${categoryCounts['Sağlık'] || 0} kayıt

**2. Öğretmen Grubu & Sınıf Başarı Durumu:**
${topGrp ? `- **Haftanın Öne Çıkan Grubu:** **${topGrp.displayName || topGrp.name}** grubu (+${topGrp.score} Puan, %${topGrp.efficiencyRate} Verim) haftayı en gayretli grup olarak tamamlamıştır.` : ''}
${topCls ? `- **Lider Bölüm/Sınıf:** **${topCls.name}** sınıfı (+${topCls.score} Puan) öne çıkmıştır.` : ''}

**3. Öne Çıkan Gayretli Talebelerimiz:**
${topStList ? `Hafta boyunca gösterdikleri üstün gayret ve disiplinle öne çıkan talebelerimiz: **${topStList}**.` : 'Tüm talebelerimiz genel disiplin kurallarına riayet etmiştir.'}

${supportList ? `\n**4. Birebir Takip ve Rehberlik Gereken Talebeler:**\nÖnümüzdeki hafta rehberlik birimimizce yakından takip edilecek talebelerimiz: ${supportList}.` : ''}

**5. Kurumsal Değerlendirme & Kapanış:**
Tüm öğretmenlerimize ve idarecilerimize fedakâr çalışmalarından ötürü teşekkür eder, talebelerimizin muvaffakiyetlerinin devamını dileriz.
      `.trim();

      return NextResponse.json({
        success: true,
        summary: defaultSummary
      });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const groupsSummary = (stats.topGroups || []).map(g => 
      `- ${g.displayName || g.name}: ${g.studentCount} talebe, ${g.reportCount} rapor, %${g.efficiencyRate} verim, +${g.score} puan`
    ).join('\n');

    const prompt = `
Sen bir yurt ve eğitim kurumu olan "${institutionName}" kurumunun Genel Müdürü ve Baş Yöneticisisin.
Aşağıda kurumuna ait son 7 günlük gerçek ve güncel takip verileri yer almaktadır:

- Kurum Adı: ${institutionName}
- Toplam Girilen Rapor Sayısı: ${stats.weeklyReportsCount || 0} (Tüm zamanlar kalıcı toplam: ${stats.allTimeReportsCount || stats.weeklyReportsCount || 0})
- Genel Başarı / Verim Oranı: %${stats.overallEfficiency || 100}
- Kategori Dağılımı:
  * Yoklama & İştirak: ${categoryCounts['Yoklama'] || stats.weeklyYoklamaCount || 0}
  * Akademik Çalışmalar: ${categoryCounts['Akademik'] || stats.weeklyAkademikCount || 0}
  * Dahili Ders Takibi: ${categoryCounts['Dahili Ders'] || stats.weeklyDahiliCount || 0}
  * Girdi - Çıktı & Vakit Disiplini (Namaz/İzin): ${categoryCounts['Girdi Çıktı'] || 0}
  * Program & Manevi Faaliyetler: ${categoryCounts['Program'] || 0}
  * Sağlık & Revir Kayıtları: ${categoryCounts['Sağlık'] || 0}

- Öğretmen Grupları Performansı (Çetinkaya, Aldemir, Mısırlı, Güney, Çetinkaya İhzari, Yerlikaya, Kalkan, Zauzı, Kaşıtoğlu):
${groupsSummary}

- Lider Sınıf: ${topCls ? `${topCls.name} (+${topCls.score} Puan, %${topCls.efficiencyRate} Verim)` : 'Yok'}
- Lider Öğretmen Grubu: ${topGrp ? `${topGrp.displayName || topGrp.name} (+${topGrp.score} Puan, %${topGrp.efficiencyRate} Verim)` : 'Yok'}
- Haftanın En Gayretli Talebeleri: ${JSON.stringify((stats.topStudents || []).slice(0, 8))}
- Rehberlik ve Takip Gereken Talebeler: ${JSON.stringify((stats.studentsNeedingSupport || []).slice(0, 6))}
- Öğretmen Performansı: ${JSON.stringify(stats.teacherPerformance || {})}

GÖREVİN:
Sanki kurum müdürü bizzat kendi elleriyle yazmış gibi, çok şık, kurumsal, saygın, otoriter ve pedagojik dilde KAPSAMLI VE DETAYLI HAFTALIK KURUMSAL İDARE DEĞERLENDİRME RAPORU hazırlamaktır.

RAPOR FORMATI:
1. Kurumsal Başlık (Örn: "${institutionName.toUpperCase()} HAFTALIK İDARE VE GELİŞİM RAPORU")
2. Genel İştirak ve Disiplin İcmali (Yoklama, namaz, giriş-çıkış disiplini ve genel yurt intizamı)
3. Öğretmen Grupları ve Sınıf Değerlendirmesi (Öne çıkan Çetinkaya, Aldemir, Mısırlı, Güney vb. grupların ve sınıfların durum değerlendirmesi)
4. Akademik ve Dahili Ders Analizi (Ödevler, sınavlar, dahili ders katılımı ve etüt gayretleri)
5. Öne Çıkan Talebelerin Taltifi (Gayretli evlatlarımızın isimleriyle takdiri)
6. Birebir Takip ve İyileştirme Alanları (Rehberlik edilecek talebeler ve dikkat edilecek hususlar)
7. Gelecek Hafta Hedefleri ve Kurumsal Kapanış Mesajı

Kurumsal üsluba uygun Markdown formatında hazırla. Gereksiz yapay zeka klişeleri kullanma, tamamen gerçek bir kurum idarecisinin kaleminden çıkmış gibi doğal, vakur ve derinlemesine olsun.
`;

    const result = await model.generateContent(prompt);
    const resultText = result.response.text().trim();

    return NextResponse.json({ success: true, summary: resultText });

  } catch (error) {
    console.error("AI Weekly Summary Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      summary: "Haftalık kurumsal değerlendirme raporu oluşturulurken bir hata meydana geldi."
    }, { status: 500 });
  }
}
