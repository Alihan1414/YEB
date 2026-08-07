'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  RefreshCw, BookOpen, Star, Heart, Monitor, Smartphone, Sun, Moon,
  ArrowRight, ChevronLeft, Maximize, Minimize, Sparkles, Compass
} from 'lucide-react';

// Dönen Hadis-i Şerifler
const HADITHS = [
  {
    text: "Bir topluluk Allah'ın evlerinden bir evde toplanır, Allah'ın kitabını okur ve onu aralarında müzakere ederlerse, üzerlerine sekîne iner, onları rahmet kaplar, melekler etraflarını kuşatır.",
    source: "Müslim, Zikir 38"
  },
  {
    text: "İlim öğrenmek her Müslümana farzdır.",
    source: "İbn Mâce, Mukaddime 17"
  },
  {
    text: "Sizin en hayırlınız Kur'an'ı öğrenen ve öğretendir.",
    source: "Buhârî, Fezâilü'l-Kur'ân 21"
  },
  {
    text: "Güzel ahlakı tamamlamak üzere gönderildim.",
    source: "Muvatta, Hüsnü'l-Huluk 8"
  },
  {
    text: "Mümin, diğer müminlere binânın tuğlaları gibidir; birbirini sağlamlaştırır.",
    source: "Buhârî, Salât 88"
  }
];

// Dönen motivasyon sözleri
const MOTTOS = [
  { title: "İyilikle, bilgiyle ve sabırla...", sub: "Günün her anı değerli olsun." },
  { title: "Öğrenmek ibadet, öğretmek sadakadır.", sub: "Her gün yeni bir adım at." },
  { title: "Sabır ve azimle her zirve aşılır.", sub: "Başarmak için azmetmek yeter." },
  { title: "Kalpler ancak Allah'ın zikriyle huzur bulur.", sub: "Huzur ve bereket dileriz." },
  { title: "İlim öğrenmek beşikten mezara kadardır.", sub: "Öğrenmeye asla dur deme." },
];

// Gece / Akşam Kayan Yıldızlar ve Işıltılı Yıldızlar
function Particles({ isNight }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 75 }, (_, i) => ({
        id: i,
        x: ((i * 37) % 95) + 2,
        y: ((i * 23) % 60) + 2,
        size: (i % 3) * 0.8 + 1.2,
        duration: (i % 5) + 3,
        delay: (i % 4) * 1.2,
        opacity: ((i % 7) + 3) / 10,
      })),
    []
  );

  if (!isNight) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Yıldızlar */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animation: `twinkle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* Kayan Yıldız (Shooting Star) */}
      <div className="shooting-star-1" />
      <div className="shooting-star-2" />
    </div>
  );
}

// Süzülen İstanbul Martıları Silueti
function FlyingSeagulls() {
  return (
    <div className="absolute top-24 left-[15%] pointer-events-none z-[1] opacity-40">
      <svg width="120" height="40" viewBox="0 0 120 40" className="animate-float-slow">
        {/* Martı 1 */}
        <path d="M10,20 Q20,10 30,20 Q40,10 50,20" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
        {/* Martı 2 */}
        <path d="M60,15 Q68,7 76,15 Q84,7 92,15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Martı 3 */}
        <path d="M95,25 Q101,19 107,25 Q113,19 119,25" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Canlı Saat Bileşeni
function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-right">
      <div className="text-5xl md:text-6xl font-black text-white tracking-tight tabular-nums drop-shadow-2xl flex items-baseline justify-end" style={{ textShadow: '0 0 40px rgba(253,230,138,0.5)' }}>
        <span>{time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="text-amber-300/90 text-3xl ml-1 font-bold">:{String(time.getSeconds()).padStart(2, '0')}</span>
      </div>
      <div className="text-amber-100/90 text-xs md:text-sm mt-0.5 font-bold tracking-wide">
        {time.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

// Akıcı Sayı Sayacı
function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(value || 0);

  useEffect(() => {
    const startVal = display;
    const endVal = value || 0;
    if (startVal === endVal) return;

    const diff = endVal - startVal;
    let stepCount = 0;
    const totalSteps = 20;

    const t = setInterval(() => {
      stepCount++;
      if (stepCount >= totalSteps) {
        setDisplay(endVal);
        clearInterval(t);
      } else {
        setDisplay(Math.round(startVal + (diff * (stepCount / totalSteps))));
      }
    }, 30);

    return () => clearInterval(t);
  }, [value]);

  return <>{display}</>;
}

// Gerçek Zamanlı Güneş / Ay ve İstanbul Gökyüzü Hesabı
function useSunPosition() {
  const [skyData, setSkyData] = useState({
    x: 50,
    y: 30,
    isSun: true,
    skyGradient: 'linear-gradient(180deg, #071938 0%, #0c2a5e 35%, #103b7a 65%, #1852a1 85%, #1d64c0 100%)',
    phaseName: 'Gündüz',
    isNight: false,
    sunGlowColor: 'rgba(251,191,36,0.5)',
  });

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const totalSec = hours * 3600 + minutes * 60 + seconds;

      // Gün doğumu: 06:00 (21600 sn), Gün batımı: 20:00 (72000 sn)
      const sunriseSec = 6 * 3600;
      const sunsetSec = 20 * 3600;

      const isSun = totalSec >= sunriseSec && totalSec <= sunsetSec;
      let progress = 0;

      if (isSun) {
        progress = (totalSec - sunriseSec) / (sunsetSec - sunriseSec); // 0 -> 1 (Doğu -> Batı)
      } else {
        // Gece (Batı -> Doğu)
        if (totalSec > sunsetSec) {
          progress = (totalSec - sunsetSec) / ((24 * 3600 - sunsetSec) + sunriseSec);
        } else {
          progress = (totalSec + (24 * 3600 - sunsetSec)) / ((24 * 3600 - sunsetSec) + sunriseSec);
        }
      }

      // X ekseni: Doğu (%5) -> Batı (%95)
      const x = 5 + progress * 90;
      // Y ekseni (Parabolik Yay): Ufuk (%78) -> Zirve (%15) -> Ufuk (%78)
      const y = 78 - Math.sin(progress * Math.PI) * 63;

      let skyGradient = '';
      let phaseName = '';
      let isNight = false;
      let sunGlowColor = 'rgba(251,191,36,0.5)';

      if (hours >= 5 && hours < 8) {
        // Şafak / Muazzam İstanbul Gün Doğumu
        phaseName = 'Gün Doğumu (Şafak Vakti)';
        sunGlowColor = 'rgba(249,115,22,0.85)';
        skyGradient = 'linear-gradient(180deg, #090d16 0%, #1e1b4b 25%, #431407 55%, #9a3412 75%, #ea580c 100%)';
      } else if (hours >= 8 && hours < 17) {
        // Gündüz
        phaseName = 'Gündüz (Boğaziçi Işığı)';
        sunGlowColor = 'rgba(251,191,36,0.7)';
        skyGradient = 'linear-gradient(180deg, #051636 0%, #0a295c 30%, #0f3d7e 60%, #1752a3 85%, #2563eb 100%)';
      } else if (hours >= 17 && hours < 20) {
        // Akşam / Kızıl İstanbul Gün Batımı
        phaseName = 'Gün Batımı (Akşam Kızıllığı)';
        sunGlowColor = 'rgba(239,68,68,0.9)';
        skyGradient = 'linear-gradient(180deg, #050811 0%, #1a103c 25%, #31103f 50%, #701a75 75%, #c2410c 100%)';
      } else {
        // Gece
        phaseName = 'Gece (İstanbul Mehtabı)';
        isNight = true;
        sunGlowColor = 'rgba(192,132,252,0.6)';
        skyGradient = 'linear-gradient(180deg, #020617 0%, #040b1e 30%, #06132e 65%, #051638 100%)';
      }

      setSkyData({ x, y, isSun, skyGradient, phaseName, isNight, sunGlowColor, progress });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, []);

  return skyData;
}

// Vektörel Görsel Şölen İstanbul Manzarası
function IstanbulSilhouette({ skyData }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0 overflow-hidden" style={{ height: '340px' }}>
      {/* Ufuk Işığı Vurgusu */}
      <div
        className="absolute bottom-20 left-0 right-0 h-36 opacity-50 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at ${skyData.x}% 100%, ${skyData.sunGlowColor} 0%, transparent 70%)`,
        }}
      />

      <svg viewBox="0 0 1440 340" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="istanbulBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1936" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#020817" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="istanbulFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#051024" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#01030a" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="bosphorusWater" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#09223c" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#020914" stopOpacity="0.98" />
          </linearGradient>
        </defs>

        {/* ── ARKA PLAN: Siluet Dağlar ve Tepeler ── */}
        <path d="M0,340 L0,230 Q180,190 360,220 Q540,250 720,200 Q900,170 1080,210 Q1260,240 1440,205 L1440,340 Z" fill="url(#istanbulBgGrad)" />

        {/* ── İSTANBUL SİLÜETİ LANDMARKS ── */}
        <g fill="url(#istanbulFrontGrad)">
          {/* 1. GALATA KULESİ (Sol Taraf ~ 190px) */}
          <g transform="translate(190, 120)">
            {/* Kule gövdesi */}
            <path d="M25,120 L28,40 L42,40 L45,120 Z" />
            {/* Balkon halkası */}
            <rect x="24" y="38" width="22" height="4" rx="1" fill="#f59e0b" opacity="0.4" />
            {/* Kule pencereleri (Amber Işıklı) */}
            <circle cx="35" cy="55" r="2.5" fill="#fbbf24" className="animate-pulse" />
            <circle cx="35" cy="75" r="2" fill="#fbbf24" className="animate-pulse" />
            {/* Kule çatısı (Koni) */}
            <path d="M26,38 L35,10 L44,38 Z" />
            {/* Aleç / Tepelik */}
            <line x1="35" y1="10" x2="35" y2="4" stroke="#051024" strokeWidth="2" />
          </g>

          {/* 2. AYASOFYA / SULTANAHMET CAMİİ KUBBELERİ VE MİNARELERİ (Sağ Taraf ~ 880px) */}
          <g transform="translate(880, 90)">
            {/* Ana Büyük Kubbe */}
            <path d="M90,150 A50,45 0 0,1 190,150 Z" />
            {/* Yan Küçük Kubbeler */}
            <path d="M60,150 A25,22 0 0,1 110,150 Z" />
            <path d="M170,150 A25,22 0 0,1 220,150 Z" />
            {/* Camii Gövde Yapısı */}
            <rect x="50" y="148" width="180" height="32" />

            {/* Minare 1 (Sol Dış) */}
            <path d="M35,180 L38,30 L40,30 L43,180 Z" />
            <path d="M36,30 L39,12 L42,30 Z" />
            <line x1="39" y1="12" x2="39" y2="6" stroke="#051024" strokeWidth="1.5" />
            <circle cx="39" cy="5" r="2" fill="#fbbf24" className="animate-pulse" />

            {/* Minare 2 (Sol İç) */}
            <path d="M72,180 L74,40 L76,40 L78,180 Z" />
            <path d="M73,40 L75,25 L77,40 Z" />

            {/* Minare 3 (Sağ İç) */}
            <path d="M202,180 L204,40 L206,40 L208,180 Z" />
            <path d="M203,40 L205,25 L207,40 Z" />

            {/* Minare 4 (Sağ Dış) */}
            <path d="M237,180 L240,30 L242,30 L245,180 Z" />
            <path d="M238,30 L241,12 L244,30 Z" />
            <line x1="241" y1="12" x2="241" y2="6" stroke="#051024" strokeWidth="1.5" />
            <circle cx="241" cy="5" r="2" fill="#fbbf24" className="animate-pulse" />
          </g>

          {/* 3. KIZ KULESİ (Ortanın Solu ~ 500px - Deniz Üstünde Ada & Fener Işığı) */}
          <g transform="translate(500, 170)">
            {/* Ada Kayalık taban */}
            <path d="M10,90 Q45,78 80,90 Z" />
            {/* Alt Bina / Sur */}
            <rect x="25" y="65" width="40" height="20" rx="1" />
            {/* Kule Gövdesi */}
            <rect x="35" y="42" width="20" height="24" />
            {/* Kule Kubbesi */}
            <path d="M32,42 Q45,28 58,42 Z" />
            {/* Fener Işığı Hüzmesi (Rotating Beacon) */}
            <path d="M45,35 L120,0 L140,80 Z" fill="rgba(253,224,71,0.2)" className="animate-lighthouse" />
            {/* Bayrak Direği */}
            <line x1="45" y1="28" x2="45" y2="12" stroke="#051024" strokeWidth="1.5" />
            {/* Türk Bayrağı */}
            <path d="M45,12 L54,16 L45,20 Z" fill="#ef4444" />
          </g>

          {/* 4. BOĞAZİÇİ KÖPRÜSÜ (15 Temmuz Şehitler Köprüsü Işıkları ~ 1150px) */}
          <g opacity="0.8">
            {/* Kule 1 */}
            <rect x="1150" y="120" width="4" height="120" fill="#051024" />
            <circle cx="1152" cy="120" r="2" fill="#ef4444" className="animate-ping" />
            {/* Kule 2 */}
            <rect x="1300" y="130" width="4" height="110" fill="#051024" />
            <circle cx="1302" cy="130" r="2" fill="#ef4444" className="animate-ping" />
            {/* Taşıyıcı Halatlar ve Kırmızı-Mavi Neon Işıklar */}
            <path d="M1100,210 Q1150,120 1225,170 Q1300,130 1380,220" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" className="animate-pulse" />
            {/* Yol Tabliyesi */}
            <rect x="1080" y="210" width="310" height="5" fill="#051024" />
          </g>

          {/* Ön Kıyı Çizgisi */}
          <path d="M0,340 L0,260 Q200,250 400,265 Q600,275 800,255 Q1000,245 1200,260 Q1350,270 1440,255 L1440,340 Z" fill="url(#istanbulFrontGrad)" />
        </g>

        {/* ── ÖN PLAN: BOĞAZİÇİ DENİZİ VE DALGALARI ── */}
        <rect x="0" y="275" width="1440" height="65" fill="url(#bosphorusWater)" />
        {/* Deniz Yakamoz Yansımaları */}
        <ellipse cx={`${skyData.x}%`} cy="295" rx="140" ry="14" fill={skyData.sunGlowColor} opacity="0.3" />
        <ellipse cx={`${skyData.x}%`} cy="315" rx="90" ry="10" fill={skyData.sunGlowColor} opacity="0.4" />
      </svg>
    </div>
  );
}

// Mobil Cihaz Uyarı Ekranı
function MobileWarningModal({ onProceed }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#020617]/96 backdrop-blur-2xl flex items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6 animate-slide-up">
        {/* Simge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl animate-breathe">
          <Monitor size={40} />
        </div>

        {/* Başlıklar */}
        <div className="space-y-2">
          <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            📺 TV &amp; Projeksiyon Ekranı
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
            Lütfen Bilgisayarınızdan Görüntüleyin
          </h2>
          <p className="text-xs text-blue-200/80 leading-relaxed font-medium pt-1">
            Bu TV paneli kurumsal sınıflar, lobiler ve geniş ekran projeksiyon sistemleri için özel olarak tasarlanmıştır. Telefon ekranında tam görünüm sağlanamaz.
          </p>
        </div>

        {/* Bilgi Kutusu */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left flex items-center gap-3 text-xs text-blue-100">
          <Smartphone size={24} className="text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">Mobil Ekran Algılandı</span>
            <span className="text-[11px] text-blue-300">En iyi deneyim için bilgisayar veya akıllı TV ekranı kullanın.</span>
          </div>
        </div>

        {/* Buton */}
        <button
          onClick={onProceed}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 group"
        >
          <span>Yine de Önizlemeye Devam Et</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

export default function TVPage() {
  const { user, institutionId, institutionName, logoUrl, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hadithIdx, setHadithIdx] = useState(0);
  const [mottoIdx, setMottoIdx] = useState(0);
  const [hadithVisible, setHadithVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mobil algılama & Uyarısı
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [dismissMobileWarning, setDismissMobileWarning] = useState(false);

  // Gerçek Zamanlı Güneş & İstanbul Gökyüzü Hesabı
  const skyData = useSunPosition();

  // Ekran boyutu kontrolü (1024px altı mobil sayılır)
  useEffect(() => {
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Tam ekran geçiş fonksiyonu
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Hadis ve Motto rotasyonu (12 saniyede bir)
  useEffect(() => {
    const interval = setInterval(() => {
      setHadithVisible(false);
      setTimeout(() => {
        setHadithIdx(i => (i + 1) % HADITHS.length);
        setMottoIdx(i => (i + 1) % MOTTOS.length);
        setHadithVisible(true);
      }, 600);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Canlı Veri Çekme (Öğrenci sayısı anında güncellenir)
  const fetchData = useCallback(async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/students/reports?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
      ]);
      const [sData, rData] = await Promise.all([sRes.json(), rRes.json()]);
      if (sData.success && Array.isArray(sData.students)) {
        setStudents(sData.students);
      }
      if (rData.success && Array.isArray(rData.reports)) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setReports(rData.reports.filter(r => r.created_at && new Date(r.created_at) >= weekAgo));
      }
      setLastRefresh(new Date());
    } catch (e) {
      console.error("TV Data Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    if (user) Promise.resolve().then(() => fetchData());
  }, [user, fetchData]);

  // Canlı Takip Polling: Her 3 saniyede bir veriyi yeniler (yeni öğrenci eklendiğinde anında yansır)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  // Sayfa görünür hale geldiğinde anında yenile
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, fetchData]);

  const catCounts = {};
  reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  const recentReports = [...reports].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10);
  const hadith = HADITHS[hadithIdx];
  const motto = MOTTOS[mottoIdx];

  return (
    <div
      className="min-h-screen text-white select-none relative overflow-hidden font-sans flex flex-col transition-all duration-1000"
      style={{ background: skyData.skyGradient }}
    >
      {/* Mobil cihaz uyarı penceresi */}
      {isMobileScreen && !dismissMobileWarning && (
        <MobileWarningModal onProceed={() => setDismissMobileWarning(true)} />
      )}

      {/* CSS Animasyonları & Görsel Şölen Stilleri */}
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.1; transform: scale(0.8); }
          100% { opacity: 0.9; transform: scale(1.3); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(2deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(-2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 25px rgba(251,191,36,0.35), 0 0 70px rgba(251,191,36,0.15); }
          50% { box-shadow: 0 0 55px rgba(251,191,36,0.7), 0 0 120px rgba(251,191,36,0.3); }
        }
        @keyframes ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ring-counter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes sun-flare {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.18); opacity: 0.8; }
        }
        @keyframes lighthouse {
          0% { opacity: 0.1; transform: rotate(-15deg); }
          50% { opacity: 0.5; transform: rotate(25deg); }
          100% { opacity: 0.1; transform: rotate(-15deg); }
        }
        @keyframes shooting-star {
          0% { transform: translateX(0) translateY(0) rotate(-35deg); opacity: 1; width: 0px; }
          70% { opacity: 1; width: 120px; }
          100% { transform: translateX(-600px) translateY(400px) rotate(-35deg); opacity: 0; width: 0px; }
        }
        .shooting-star-1 {
          position: absolute; top: 15%; right: 20%; height: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,1), transparent);
          animation: shooting-star 9s linear 2s infinite; pointer-events: none;
        }
        .shooting-star-2 {
          position: absolute; top: 25%; right: 40%; height: 1.5px;
          background: linear-gradient(90deg, rgba(253,224,71,1), transparent);
          animation: shooting-star 12s linear 7s infinite; pointer-events: none;
        }
        .animate-marquee { animation: marquee 40s linear infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3.5s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        .animate-lighthouse { animation: lighthouse 7s ease-in-out infinite; transform-origin: 45px 35px; }
        .hadith-transition { transition: opacity 0.6s ease, transform 0.6s ease; }
        .hadith-hidden { opacity: 0; transform: translateY(10px); }
        .hadith-visible { opacity: 1; transform: translateY(0); }
        .shimmer-text {
          background: linear-gradient(90deg, #fef08a 0%, #ffffff 40%, #fde047 60%, #fef08a 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* Gece Yıldızları & Kayan Yıldızlar */}
      <Particles isNight={skyData.isNight} />

      {/* Süzülen İstanbul Martıları */}
      <FlyingSeagulls />

      {/* ── GÜNEŞ / AY (Gerçek Zamanlı Saat ile Doğudan Doğup Batıdan Batma) ── */}
      <div
        className="absolute pointer-events-none transition-all duration-1000 ease-out z-0"
        style={{
          left: `${skyData.x}%`,
          top: `${skyData.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {skyData.isSun ? (
          /* Gerçek Zamanlı Güneş */
          <div className="relative flex items-center justify-center">
            {/* Güneş Işın Halesi */}
            <div
              className="absolute w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(251,191,36,0.65) 0%, rgba(245,158,11,0.25) 50%, transparent 75%)',
                animation: 'sun-flare 4s ease-in-out infinite',
              }}
            />
            {/* Güneş Çekirdeği */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 shadow-[0_0_60px_rgba(251,191,36,0.9)] border-2 border-amber-100 flex items-center justify-center">
              <Sun size={30} className="text-amber-950 animate-spin" style={{ animationDuration: '25s' }} />
            </div>
          </div>
        ) : (
          /* Gerçek Zamanlı Gece Ay / Mehtap */
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-44 h-44 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(192,132,252,0.45) 0%, rgba(147,51,234,0.18) 50%, transparent 75%)',
                animation: 'sun-flare 5s ease-in-out infinite',
              }}
            />
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-100 via-purple-100 to-purple-300 shadow-[0_0_45px_rgba(192,132,252,0.85)] border border-white flex items-center justify-center">
              <Moon size={26} className="text-purple-950" />
            </div>
          </div>
        )}
      </div>

      {/* İstanbul Vektörel Manzarası */}
      <IstanbulSilhouette skyData={skyData} />

      {/* === HEADER (Çıkış / Geri Dön + Tam Ekran Butonları Eklendi) === */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6 pb-4">
        
        {/* SOL: Geri Dön Butonu + Logo + Kurum Adı */}
        <div className="flex items-center gap-5">
          {/* 🚪 GERİ DÖN / ÇIKIŞ BUTONU */}
          <button
            onClick={() => router.push('/')}
            title="Öğrenci Paneline Dön"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-amber-200 font-bold text-xs shadow-xl backdrop-blur-md transition-all active:scale-95 group shrink-0"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform text-amber-400" />
            <span>Panele Dön</span>
          </button>

          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl animate-pulse-glow shrink-0">
            <img src={logoUrl || '/logo.png'} alt={institutionName || 'Logo'} className="w-full h-full object-contain p-1.5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight shimmer-text">
              {institutionName || 'Kurumsal Raporlama'}
            </h1>
            <div className="flex items-center gap-2 text-amber-200/80 text-xs mt-0.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{skyData.phaseName}</span>
              <span>•</span>
              <span>Birlikte öğreniyor, birlikte gelişiyoruz.</span>
            </div>
          </div>
        </div>

        {/* SAĞ: Tam Ekran + Yenile + Canlı Saat */}
        <div className="flex items-center gap-4">
          <Clock />

          <div className="flex items-center gap-2">
            {/* Tam Ekran Geçiş Butonu */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
              className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-all active:scale-95 text-amber-200 backdrop-blur-md"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            {/* Yenile Butonu */}
            <button
              onClick={fetchData}
              title="Verileri Yenile"
              className="p-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-all active:scale-95 text-amber-200 backdrop-blur-md"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* === ANA İÇERİK === */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-5 px-8 pb-4" style={{ minHeight: 0 }}>

        {/* SOL: Canlı Öğrenci Sayacı */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Dairesel Gösterge */}
          <div
            className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 20px 60px rgba(0,0,0,0.4)' }}
          >
            {/* Dönen Çember */}
            <div className="relative flex items-center justify-center mb-4" style={{ width: 170, height: 170 }}>
              {/* Dış dönen halka */}
              <svg className="absolute inset-0 w-full h-full" style={{ animation: 'ring-rotate 8s linear infinite' }}>
                <circle cx="85" cy="85" r="76" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" strokeDasharray="6 4" />
                <circle cx="85" cy="85" r="76" fill="none" stroke="rgba(251,191,36,0.8)" strokeWidth="2.5" strokeDasharray="35 440" strokeLinecap="round" />
              </svg>
              {/* İç parlayan çember */}
              <svg className="absolute inset-0 w-full h-full" style={{ animation: 'ring-counter 12s linear infinite' }}>
                <circle cx="85" cy="85" r="62" fill="none" stroke="rgba(167,139,250,0.4)" strokeWidth="1" strokeDasharray="4 8" />
              </svg>
              {/* Merkez Sayı */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-6xl font-black text-white" style={{ textShadow: '0 0 35px rgba(251,191,36,0.9)' }}>
                  <AnimatedCounter value={students.length} />
                </div>
                <div className="text-amber-300 text-xs font-black tracking-widest uppercase mt-1">Aktif Öğrenci</div>
              </div>
            </div>

            {/* Canlı Sistem Durumu */}
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-4 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
              <span>Canlı Senkronize</span>
            </div>

            {/* Arka plan parlama efekti */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)', filter: 'blur(20px)' }}
              />
            </div>
          </div>

          {/* Bu Hafta Rapor */}
          <div
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-center"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            <div className="text-3xl font-black text-amber-300 mb-1">
              <AnimatedCounter value={reports.length} />
            </div>
            <div className="text-blue-200 text-xs font-bold uppercase tracking-widest">Bu Hafta Girilen Rapor</div>
          </div>
        </div>

        {/* ORTA: Hadis-i Şerif */}
        <div className="col-span-6">
          <div
            className="h-full bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden animate-float-slow"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 30px 80px rgba(0,0,0,0.5)' }}
          >
            {/* Başlık */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center mb-3 animate-breathe">
                <BookOpen size={22} className="text-amber-300" />
              </div>
              <div className="text-amber-300 text-xs font-black tracking-[0.2em] uppercase flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400 animate-spin" />
                <span>Günün Hadis-i Şerifi</span>
                <Sparkles size={14} className="text-amber-400 animate-spin" />
              </div>
            </div>

            <div className={`flex-1 flex items-center justify-center hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              <div className="text-center">
                <div className="text-amber-300/40 text-6xl font-serif leading-none mb-2 -mt-4">&ldquo;</div>
                <p
                  className="text-lg md:text-xl font-semibold leading-relaxed text-amber-50 font-serif italic"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
                >
                  {hadith.text}
                </p>
                <div className="text-amber-300/40 text-6xl font-serif leading-none mt-2">&rdquo;</div>
              </div>
            </div>

            <div className={`pt-4 border-t border-white/10 flex justify-center hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              <span className="text-xs font-bold text-amber-200 bg-amber-400/15 border border-amber-400/30 px-4 py-1.5 rounded-full tracking-wider">
                {hadith.source}
              </span>
            </div>

            {/* Sayfa Noktaları */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {HADITHS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${i === hadithIdx ? 'w-5 h-2 bg-amber-400' : 'w-2 h-2 bg-white/20'}`} />
              ))}
            </div>

            {/* Dekoratif Işıklar */}
            <div
              className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
              style={{ background: 'radial-gradient(circle at top right, rgba(251,191,36,0.12) 0%, transparent 70%)' }}
            />
            <div
              className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
              style={{ background: 'radial-gradient(circle at bottom left, rgba(249,115,22,0.12) 0%, transparent 70%)' }}
            />
          </div>
        </div>

        {/* SAĞ: Motto + İstatistik */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Motto Kartı */}
          <div
            className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden animate-float-medium"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            <div className="flex justify-end mb-4">
              <Heart size={22} className="text-pink-400 animate-breathe" />
            </div>
            <div className={`hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              <h3
                className="text-xl font-black text-white leading-snug mb-3"
                style={{ textShadow: '0 0 30px rgba(251,191,36,0.4)' }}
              >
                {motto.title}
              </h3>
              <div className="w-12 h-0.5 bg-gradient-to-r from-amber-400 to-transparent mb-3" />
              <p className="text-blue-100/90 text-sm font-medium leading-relaxed">{motto.sub}</p>
            </div>
            <div className="mt-auto pt-4">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Günün Mesajı</div>
            </div>
            <div
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ background: 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.1) 0%, transparent 60%)' }}
            />
          </div>

          {/* Kategori Özeti */}
          <div
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            <div className="text-xs font-black text-amber-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Star size={14} className="text-amber-400" /> Kategori Dağılımı
            </div>
            <div className="space-y-2.5">
              {Object.entries(catCounts).slice(0, 3).map(([cat, cnt]) => {
                const total = reports.length || 1;
                const pct = Math.round((cnt / total) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-100 font-semibold">{cat}</span>
                      <span className="text-amber-300 font-black text-[11px]">{cnt} rapor (%{pct})</span>
                    </div>
                    {/* Canlı İlerleme Çubuğu */}
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(catCounts).length === 0 && (
                <p className="text-xs text-blue-200/50 text-center py-2">Henüz rapor bulunmuyor</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ALT: 3 Alt Bilgi Kartı */}
      <div className="relative z-10 grid grid-cols-3 gap-5 px-8 pb-4">
        {[
          { icon: <BookOpen size={26} className="text-amber-300" />, color: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', title: 'İlim ve Bilgi', sub: 'Her gün yeni bir ders, geleceğe atılan sağlam bir adımdır.' },
          { icon: <Heart size={26} className="text-emerald-300" />, color: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', title: 'İyilik ve Ahlak', sub: 'İyiliği paylaş, güzel ahlakı hayatının merkezine al.' },
          { icon: <Star size={26} className="text-purple-300" />, color: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', title: 'Azim ve İstikrar', sub: 'Disiplinle çalış, sürekli kendini geliştirmeye devam et.' },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-all duration-300"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 animate-breathe"
              style={{ background: card.color, border: `1px solid ${card.border}`, animationDelay: `${i * 0.5}s` }}
            >
              {card.icon}
            </div>
            <div>
              <div className="text-white font-black text-sm">{card.title}</div>
              <div className="text-blue-200/80 text-xs font-medium mt-0.5 leading-relaxed">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ALT: Canlı Son Rapor Ticker */}
      <div
        className="relative z-10 mx-8 mb-3 bg-black/50 backdrop-blur-2xl border border-white/15 rounded-2xl overflow-hidden flex items-center"
        style={{ height: 44 }}
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black tracking-widest uppercase px-4 py-2 flex items-center gap-2 shrink-0 h-full">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          CANLI AKIŞ
        </div>
        <div className="flex-1 overflow-hidden h-full flex items-center">
          <div className="whitespace-nowrap animate-marquee text-xs text-amber-100 font-medium flex items-center gap-6">
            {recentReports.length > 0 ? recentReports.map((r, i) => (
              <span key={r.id || i} className="inline-flex items-center gap-2">
                <span className="font-extrabold text-amber-300">{r.student_name || 'Öğrenci'}</span>
                <span className="text-white/90">{r.content?.slice(0, 70)}{r.content?.length > 70 ? '...' : ''}</span>
                <span className="bg-amber-400/20 border border-amber-400/30 text-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">{r.category}</span>
                <span className="text-amber-500/60 mx-2">◆</span>
              </span>
            )) : (
              <span className="text-amber-200/70">Sistem aktif · Öğrenci takip ve canlı raporlama ekranı yayında · Eklenen raporlar anında buraya yansıyacak</span>
            )}
          </div>
        </div>
        <div className="text-amber-300/70 text-[10px] font-mono px-4 shrink-0 flex items-center gap-2 border-l border-white/10 h-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{lastRefresh.toLocaleTimeString('tr-TR')}</span>
        </div>
      </div>

      {/* En Alt Footer */}
      <div className="relative z-10 pb-3 text-center">
        <div className="flex items-center justify-center gap-4 text-amber-200/60 text-xs font-black tracking-[0.25em] uppercase">
          <span>İlim</span>
          <span className="text-amber-400/40">•</span>
          <span>İyilik</span>
          <span className="text-amber-400/40">•</span>
          <span>İstikrar</span>
        </div>
      </div>
    </div>
  );
}
