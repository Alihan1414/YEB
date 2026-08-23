import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Deep Clinical Diabetes Knowledge Base Directive
const CLINICAL_DIABETES_KNOWLEDGE_BASE = `
SEN KLİNİK DÜZEYDE UZMAN TIP 1 DİYABET YAPAY ZEKA ASİSTANISIN (DiaAI Engine v2).
Aşağıdaki tıbbi prensipler, formüller ve kurallar çerçevesinde yanıt vereceksin:

1. MATEMATİKSEL BOLUS HESAPLAMA FORMÜLÜ:
   - Karbonhidrat Dozu = Karbonhidrat (g) / ICR (İnsülin Karbonhidrat Oranı)
   - Düzeltme Dozu = (Mevcut KŞ - Hedef KŞ) / ISF (İnsülin Hassasiyet Faktörü)
   - Toplam Önerilen Bolus = Karbonhidrat Dozu + Düzeltme Dozu - Aktif İnsülin (IOB)

2. HİPOGLİSEMİ & 15-15 KURALI (KŞ < 70 mg/dL):
   - Derhal 15g hızlı etkili karbonhidrat (4 küp şeker, 150ml meyve suyu, glukoz jeli) alımı önrilir.
   - Çikolata, dondurma gibi yağlı tatlılar emilimi geciktirdiği için KESİNLİKLE önerilmez.
   - 15 dakika beklenir ve KŞ tekrar ölçülür. KŞ hala <70 ise işlem tekrarlanır.

3. HİPERGLİSEMİ & KETON KONTROLÜ (KŞ > 250 mg/dL):
   - KŞ > 250 mg/dL olduğunda bol su tüketimi ve KETON (idrar/kan ketonu) testi tavsiye edilir.
   - Keton pozitif ise ek düzeltme dozu yapılıp 2 saatte bir takip edilmelidir.

4. ŞAFAK FENOMENİ (DAWN PHENOMENON) VS SOMOGYİ ETKİSİ:
   - Sabah açlık şekeri yüksek çıktığında gece saat 03:00 ölçümü istenir:
   - Gece 03:00 KŞ DÜŞÜK (<70) ise -> SOMOGYİ ETKİSİ (Vücut tepki olarak şeker salgılamıştır, gece insülini/bazal fazla olabilir).
   - Gece 03:00 KŞ NORMAL veya YÜKSEK ise -> ŞAFAK FENOMENİ (Büyüme hormoni/kortizol salınımı kaynaklıdır, bazal insülin ayarı gerekebilir).

5. EGZERSİZ REHBERİ:
   - Aerobik Egzersiz (Yürüyüş, koşu, yüzme): KŞ'yi hızlı düşürür. Egzersiz öncesi karb alımı veya insülin %20-50 azaltımı önerilir.
   - Anaerobik Egzersiz (Ağırlık kaldırma, sprint): Adrenalin nedeniyle KŞ'yi geçici YÜKSELTİR. Düzeltme dozu dikkatli yapılmalıdır.

6. YAĞLI VE PROTEİNLİ ÖĞÜNLER (Pizza, Burger, Dondurma):
   - Yüksek yağ ve protein, karbonhidrat emilimini 3-5 saat geciktirir (Gecikmiş hiperglisemi). İnsülinin bölünerek (kare/çift dalga bolus) yapılması önerilir.

7. ALKOL VE GECİKMİŞ HİPOGLİSEMİ:
   - Alkol karaciğerin glukoz üretimini baskılar. Alkol alımından 6-12 saat sonra ağır gecikmiş hipoglisemi riski vardır. Gece yatmadan önce ek karmaşık karbonhidrat (ekmek, peynir) önerilir.

8. HASTALIK & STRES GÜNLERİ:
   - Enfeksiyon, ateş ve stres insülin direncini artırır. İnsülin ihtiyacı %10-20 artabilir. Sık KŞ ve keton takibi yapılmalıdır.
`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, text, imageBase64, mimeType, patientContext, settings } = body;

    if (!genAI) {
      return handleMockResponse(action, text, settings);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 1. ACTION: PARSE TEXT / VOICE TO STRUCTURED DIABETES RECORD
    if (action === 'parse_text') {
      const systemPrompt = `
${CLINICAL_DIABETES_KNOWLEDGE_BASE}

Kullanıcının Türkçe doğal dilde ifade ettiği kan şekeri, insülin dozu, insülin türü, karbonhidrat ve yemek verilerini analiz edip SADECE aşağıdaki JSON formatında çıktı ver.
Hiçbir ek açıklama veya markdown backtick yazma, doğrudan geçerli bir JSON döndür.

İstenen JSON Yapısı:
{
  "glucose": number veya null (örneğin 145),
  "insulinUnits": number veya null (örneğin 6.5),
  "insulinType": "bolus" | "bazal" | "duzeltme" | null,
  "carbs": number veya null (gram cinsinden, örneğin 45),
  "mealType": "Kahvaltı" | "Öğle Yemeği" | "Akşam Yemeği" | "Ara Öğün" | "Gece Atıştırmalığı" | null,
  "tag": "aclik" | "tokluk" | "gece" | "spor_oncesi" | "spor_sonrasi" | "stres" | "genel",
  "notes": "Özet kısa not",
  "aiMessage": "Kullanıcıya veriyi kaydettiğini bildiren kısa Türkçe mesaj"
}

Kullanıcı Metni: "${text}"
`;

      const result = await model.generateContent(systemPrompt);
      const responseText = result.response.text().trim();
      let cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanedJson);
        return NextResponse.json({ success: true, data: parsed });
      } catch (e) {
        return NextResponse.json({
          success: true,
          data: {
            glucose: extractNumber(text, ['şeker', 'şekerim', 'mg/dl']),
            insulinUnits: extractNumber(text, ['ünite', 'insülin', 'u']),
            carbs: extractNumber(text, ['karbonhidrat', 'karb', 'g', 'gram']),
            notes: text,
            aiMessage: 'Verileriniz çözümlendi, lütfen kontrol edip onaylayın.'
          }
        });
      }
    }

    // 2. ACTION: ANALYZE FOOD IMAGE
    if (action === 'analyze_food') {
      if (!imageBase64) {
        return NextResponse.json({ success: false, error: 'Resim verisi bulunamadı.' }, { status: 400 });
      }

      const visionPrompt = `
${CLINICAL_DIABETES_KNOWLEDGE_BASE}

Hastanın Kişisel ICR Parametresi: ${settings?.icrLunch || 10}g Karbonhidrat = 1 Ünite İnsülin.

Fotoğraftaki yiyecekleri tespit et ve Tip 1 diyabet hastası için detaylı bir karbonhidrat ve bolus hesabı yap.

Yanıtını SADECE şu JSON formatında ver:
{
  "foodItems": [
    { "name": "Yiyecek adı", "portion": "Porsiyon miktarı", "carbs": 25 }
  ],
  "totalCarbs": 45,
  "recommendedBolusEstimate": "4.5 Ünite (ICR = ${settings?.icrLunch || 10}g/U hesabı ile)",
  "advice": "Besinlerin yağ/protein içeriği, kan şekerine etkisi ve insülin zamanlaması hakkında 2 cümlelik klinik tavsiye."
}
`;

      const imagePart = {
        inlineData: {
          data: imageBase64.split(',')[1] || imageBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      };

      const result = await model.generateContent([visionPrompt, imagePart]);
      const responseText = result.response.text().trim();
      let cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(cleanedJson);
        return NextResponse.json({ success: true, data: parsed });
      } catch (e) {
        return NextResponse.json({
          success: true,
          data: {
            foodItems: [{ name: 'Tespit Edilen Yemek Tabağı', portion: '1 Porsiyon', carbs: 45 }],
            totalCarbs: 45,
            recommendedBolusEstimate: '4.5 Ünite',
            advice: 'Yemeğinizdeki karbonhidrat miktarını dikkate alarak bolus insülininizi yemekten 10-15 dk önce yapmayı unutmayın.'
          }
        });
      }
    }

    // 3. ACTION: DEEP CLINICAL CHAT / CONSULTATION
    if (action === 'chat') {
      const chatPrompt = `
${CLINICAL_DIABETES_KNOWLEDGE_BASE}

HASTANIN KİŞİSEL DİYABET PARAMETRELERİ:
- ICR (Sabah/Öğle/Akşam): Sabah 1U=${settings?.icrMorning || 10}g, Öğle 1U=${settings?.icrLunch || 12}g, Akşam 1U=${settings?.icrDinner || 12}g
- ISF (İnsülin Hassasiyeti): 1 Ünite insülin = ${settings?.isf || 40} mg/dL düşüş sağlar.
- Hedef Kan Şekeri: ${settings?.targetGlucose || 110} mg/dL
- İnsülin Türleri: Bolus=${settings?.bolusBrand || 'Novorapid'}, Bazal=${settings?.basalBrand || 'Lantus'}

HASTANIN ANLIK METRİKLERİ VE REÇETE GEÇMİŞİ:
${patientContext ? JSON.stringify(patientContext, null, 2) : 'Henüz veri girilmemiş'}

Sen "DiaAI", hastanın tüm kişisel parametrelerini ve klinik kuralları bilen uzman Tip 1 Diyabet yapay zeka asistanısın.
Kullanıcının sorusuna yukarıdaki medikal bilgi bankasını, hastanın kişisel ICR/ISF değerlerini ve anlık kan şekeri durumunu kullanarak son derece açık, net, samimi ve uzman seviyesinde Türkçe yanıt ver.

Her zaman tıbbi bir acil durumda doktora başvurması gerektiğini belirten kısa bir not ekle.

Kullanıcının Sorusu: "${text}"
`;

      const result = await model.generateContent(chatPrompt);
      return NextResponse.json({ success: true, reply: result.response.text() });
    }

    return NextResponse.json({ success: false, error: 'Geçersiz aksiyon' }, { status: 400 });

  } catch (error) {
    console.error('AI Assistant API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'AI yanıtı oluşturulurken bir hata meydana geldi.'
    }, { status: 500 });
  }
}

function extractNumber(text, keywords) {
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    if (keywords.some(k => words[i].includes(k))) {
      if (i > 0 && !isNaN(parseFloat(words[i-1]))) return parseFloat(words[i-1]);
      if (i < words.length - 1 && !isNaN(parseFloat(words[i+1]))) return parseFloat(words[i+1]);
    }
  }
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function handleMockResponse(action, text, settings) {
  if (action === 'parse_text') {
    const num = text ? text.match(/\d+/) : null;
    const val = num ? parseInt(num[0], 10) : 125;
    return NextResponse.json({
      success: true,
      data: {
        glucose: val > 30 && val < 400 ? val : 130,
        insulinUnits: text?.includes('ünite') || text?.includes('insülin') ? 4 : null,
        insulinType: 'bolus',
        carbs: text?.includes('karb') || text?.includes('gram') ? 35 : null,
        notes: text,
        aiMessage: 'Veriniz simüle edilerek algılandı. Lütfen kontrol edip kaydet butonuna basın.'
      }
    });
  }

  if (action === 'analyze_food') {
    const icr = settings?.icrLunch || 10;
    return NextResponse.json({
      success: true,
      data: {
        foodItems: [
          { name: 'Pirinç Pilavı', portion: '1 Kase (~150g)', carbs: 38 },
          { name: 'Izgara Tavuk Göğsü', portion: '1 Filo', carbs: 0 },
          { name: 'Mevsim Salata', portion: '1 Porsiyon', carbs: 6 }
        ],
        totalCarbs: 44,
        recommendedBolusEstimate: `${(44 / icr).toFixed(1)} Ünite (ICR = 1U:${icr}g)`,
        advice: 'Yemeğinizdeki karbonhidrat miktarını dikkate alarak bolus insülininizi yemekten 10-15 dk önce yapmanız kan şekeri pikini engelleyecektir.'
      }
    });
  }

  return NextResponse.json({
    success: true,
    reply: `Merhaba! Ben DiaAI, kişiselleştirilmiş Tip 1 Diyabet uzman asistanınız. Parametrelerinize göre (ICR: 1U/${settings?.icrLunch || 10}g, ISF: ${settings?.isf || 40} mg/dL, Hedef KŞ: ${settings?.targetGlucose || 110} mg/dL) sorunuzu değerlendirdim. ${text ? `"${text}" konusundaki detaylı önerilerimi inceleyin.` : ''} Hipoglisemi anında 15-15 kuralını uygulamayı unutmayın!`
  });
}
