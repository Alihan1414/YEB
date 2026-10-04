import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { stats, institutionName = 'Bolu Kılıçarslan Yurdu' } = await req.json();

    const topGrp = stats?.topGroups?.[0];
    const topCls = stats?.topClasses?.[0];
    const topStList = (stats?.topStudents || []).slice(0, 3).map(s => s.name).join(', ');
    const categoryCounts = stats?.categoryCounts || {};

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.trim() === '') {
      const defaultSummary = `
**${institutionName.toUpperCase()} HAFTALIK İDARE VE GELİŞİM RAPORU**

Hafta boyunca kurumumuzda talebelerimizin akademik, ahlaki ve sosyal gelişimleri idari kadromuz ve kıymetli belleticilerimizce titizlikle takip edilmiştir. Bu süreçte toplam **${stats.weeklyReportsCount || 0}** adet faaliyet ve durum kaydı oluşturulmuş, yurt genelinde **%${stats.overallEfficiency || 95}** genel verimlilik ve başarı seviyesine ulaşılmıştır.

**Kategorik İştirak ve Disiplin:**
- **Yoklama & Katılım:** Toplam ${categoryCounts['Yoklama'] || stats.weeklyYoklamaCount || 0} kayıt ile talebelerimizin vakit disiplinine riayet ettiği gözlemlenmiştir.
- **Akademik & Dahili Ders:** ${categoryCounts['Akademik'] || stats.weeklyAkademikCount || 0} akademik çalışma ve ${categoryCounts['Dahili Ders'] || stats.weeklyDahiliCount || 0} dahili ders faaliyeti tamamlanmıştır.
- **Program & Faaliyet:** ${categoryCounts['Program'] || 0} adet sosyal ve manevi program icra edilmiştir.

${topCls ? `**Haftanın En Başarılı Sınıfı:** Gösterdiği %${topCls.efficiencyRate} iştirak verimliliği ve +${topCls.score} puan ile **${topCls.name}** sınıfımız haftanın en başarılı sınıfı seçilmiştir.` : ''}
${topStList ? `**Tebrik ve Takdir:** Gayretleriyle temayüz eden talebelerimiz (**${topStList}**) başta olmak üzere tüm evlatlarımızı tebrik eder, muvaffakiyetlerinin devamını dileriz.` : ''}

Önümüzdeki hafta dahili ders iştirakinin daha da artırılması ve etüt verimliliğinin üst seviyeye taşınması hedeflenmektedir. Emeği geçen tüm öğretmenlerimize ve destek veren velilerimize teşekkür ederiz.
      `.trim();

      return NextResponse.json({
        success: true,
        summary: defaultSummary
      });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Sen bir yurt veya eğitim kurumu olan "${institutionName}" kurumunun Genel Müdürü ve Baş Yöneticisisin.
Aşağıda kurumuna ait son 7 günlük gerçek ve güncel takip verileri yer almaktadır:

- Kurum Adı: ${institutionName}
- Toplam Girilen Rapor Sayısı: ${stats.weeklyReportsCount || 0}
- Genel Başarı / Verim Oranı: %${stats.overallEfficiency || 100}
- Kategori Dağılımı:
  * Yoklama & İştirak: ${categoryCounts['Yoklama'] || stats.weeklyYoklamaCount || 0}
  * Akademik Çalışmalar: ${categoryCounts['Akademik'] || stats.weeklyAkademikCount || 0}
  * Dahili Ders Takibi: ${categoryCounts['Dahili Ders'] || stats.weeklyDahiliCount || 0}
  * Girdi - Çıktı & Vakit Disiplini: ${categoryCounts['Girdi Çıktı'] || 0}
  * Program & Manevi Faaliyetler: ${categoryCounts['Program'] || 0}
  * Sağlık & Revir Kayıtları: ${categoryCounts['Sağlık'] || 0}
- Lider Sınıf: ${topCls ? `${topCls.name} (+${topCls.score} Puan, %${topCls.efficiencyRate} Verim)` : 'Yok'}
- Haftanın En Gayretli Talebeleri: ${JSON.stringify((stats.topStudents || []).slice(0, 5))}
- Öğretmen Performansı: ${JSON.stringify(stats.teacherPerformance || {})}

GÖREVİN:
Sanki kurum müdürü bizzat kendi elleriyle yazmış gibi, çok şık, kurumsal, saygın, otoriter ve pedagojik dilde HAFTALIK KURUMSAL YÖNETİCİ DEĞERLENDİRME VE BİLGİLENDİRME RAPORU hazırlamaktır.

RAPOR FORMATI:
1. Kurumsal Başlık (Örn: "${institutionName.toUpperCase()} HAFTALIK İDARE VE GELİŞİM RAPORU")
2. Genel İştirak ve Disiplin Özeti (Talebelerin yoklama, giriş-çıkış ve faaliyetlere riayeti)
3. Akademik ve Dahili Ders Analizi (Derslerdeki verim, dahili ders iştiraki ve etüt disiplini)
4. Lider Sınıf ve Öne Çıkan Talebelerin Taltifi (En başarılı sınıfı ve gayretli talebeleri takdir eden vakur cümleler)
5. Gelecek Hafta Hedefleri ve Kurumsal Kapanış Mesajı

ÖNEMLİ KURAL:
Öğretmenlerin dahili sesli komut için kullandığı özel grup isimlerini rapora yazma; bunun yerine genel yurt genelindeki sınıfları (Örn: 11-A, 10-B) ve öne çıkan talebeleri zikret. Kurumsal üsluba uygun Markdown formatında hazırla. Gereksiz yapay zeka klişeleri kullanma, tamamen gerçek bir kurum idarecisinin kaleminden çıkmış gibi doğal ve vakur olsun.
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
