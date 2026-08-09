'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  RefreshCw, BookOpen, Star, Heart, Sun, Moon,
  ChevronLeft, Maximize, Minimize, Sparkles, User, Users, Home, Award, CheckCircle2, ShieldAlert
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
  { title: "İyilikte, bilgide ve sabırla ilerleyin.", sub: "Günün her anı değerli olsun." },
  { title: "Öğrenmek ibadet, öğretmek sadakadır.", sub: "Her gün yeni bir adım atın." },
  { title: "Sabır ve azimle her zirve aşılır.", sub: "Başarmak için azmetmek yeter." },
  { title: "Kalpler ancak Allah'ın zikriyle huzur bulur.", sub: "Huzur ve bereket dileriz." },
  { title: "İlim öğrenmek beşikten mezara kadardır.", sub: "Öğrenmeye asla dur deme." }
];

// Gece / Akşam Kayan Yıldızlar ve Işıltılı Yıldızlar
function Particles({ isNight }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
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
      <div className="shooting-star-1" />
      <div className="shooting-star-2" />
    </div>
  );
}

// Canlı Saat Bileşeni (GG/AA/YYYY Haftanın Günü)
function Clock() {
  const [time, setTime] = useState(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!time) return <div className="h-16 w-36" />;

  return (
    <div className="text-right">
      <div className="text-5xl md:text-6xl font-black text-white tracking-tight tabular-nums flex items-baseline justify-end drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
        <span>{time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="text-amber-400 text-3xl ml-1 font-bold">:{String(time.getSeconds()).padStart(2, '0')}</span>
      </div>
      <div className="text-slate-200 text-xs md:text-sm mt-0.5 font-bold tracking-wide">
        {time.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
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

// Gerçek Zamanlı Gökyüzü Hesabı
function useSunPosition() {
  const [skyData, setSkyData] = useState({
    isNight: false,
    skyGradient: 'linear-gradient(180deg, #030a1a 0%, #061533 35%, #09204c 70%, #0b2b66 100%)',
    phaseName: 'Gündüz',
  });

  useEffect(() => {
    const calculate = () => {
      const hours = new Date().getHours();
      let isNight = false;
      let phaseName = 'Gündüz (Eğitim Vakti)';
      let skyGradient = 'linear-gradient(180deg, #030b1e 0%, #06173d 35%, #08245c 70%, #0c337c 100%)';

      if (hours >= 5 && hours < 8) {
        phaseName = 'Gün Doğumu (Şafak Vakti)';
        skyGradient = 'linear-gradient(180deg, #070a14 0%, #171638 25%, #34120a 55%, #7c2d12 80%, #c2410c 100%)';
      } else if (hours >= 8 && hours < 17) {
        phaseName = 'Gündüz (Eğitim Vakti)';
        skyGradient = 'linear-gradient(180deg, #030c22 0%, #061a45 35%, #092864 70%, #0c3886 100%)';
      } else if (hours >= 17 && hours < 20) {
        phaseName = 'Gün Batımı (Akşam Kızıllığı)';
        skyGradient = 'linear-gradient(180deg, #04060d 0%, #150d2e 25%, #2a0b36 50%, #581c87 75%, #9a3412 100%)';
      } else {
        phaseName = 'Gece (İstanbul Mehtabı)';
        isNight = true;
        skyGradient = 'linear-gradient(180deg, #01040d 0%, #030818 35%, #050d26 70%, #071338 100%)';
      }

      setSkyData({ isNight, skyGradient, phaseName });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, []);

  return skyData;
}

// Birebir Benzer İllüstrasyon İstanbul Silueti (Boğaz Köprüsü + Camii Silueti)
function IstanbulSilhouetteSVG() {
  return (
    <div className="absolute top-0 left-0 right-0 h-44 pointer-events-none z-0 overflow-hidden opacity-30">
      <svg viewBox="0 0 1440 220" className="w-full h-full preserve-3d" preserveAspectRatio="none">
        {/* Ay / Mehtap Çizgisi Halesi */}
        <path d="M 0,110 Q 720,-20 1440,110" fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" />

        {/* Camii ve Minare Siluetleri */}
        <g fill="none" stroke="rgba(147,197,253,0.35)" strokeWidth="1.2">
          {/* Kubbe 1 */}
          <path d="M 500,160 Q 530,120 560,160" />
          <line x1="490" y1="160" x2="490" y2="90" />
          <line x1="570" y1="160" x2="570" y2="90" />
          {/* Minare Külahları */}
          <path d="M 487,90 L 490,75 L 493,90" fill="rgba(147,197,253,0.35)" />
          <path d="M 567,90 L 570,75 L 573,90" fill="rgba(147,197,253,0.35)" />

          {/* Kubbe 2 (Büyük Camii) */}
          <path d="M 750,150 Q 790,95 830,150" strokeWidth="1.5" />
          <line x1="735" y1="150" x2="735" y2="60" strokeWidth="1.5" />
          <line x1="845" y1="150" x2="845" y2="60" strokeWidth="1.5" />
          <path d="M 732,60 L 735,40 L 738,60" fill="rgba(147,197,253,0.4)" />
          <path d="M 842,60 L 845,40 L 848,60" fill="rgba(147,197,253,0.4)" />
        </g>

        {/* Boğaz Köprüsü Kuleleri ve Halatları */}
        <g stroke="rgba(56,189,248,0.4)" strokeWidth="1.2" fill="none">
          {/* Sol Kule */}
          <line x1="980" y1="180" x2="980" y2="65" />
          <line x1="990" y1="180" x2="990" y2="65" />
          <line x1="975" y1="85" x2="995" y2="85" />
          <line x1="975" y1="125" x2="995" y2="125" />
          {/* Sağ Kule */}
          <line x1="1220" y1="180" x2="1220" y2="65" />
          <line x1="1230" y1="180" x2="1230" y2="65" />
          <line x1="1215" y1="85" x2="1235" y2="85" />
          <line x1="1215" y1="125" x2="1235" y2="125" />
          {/* Ana Taşıyıcı Halat */}
          <path d="M 880,140 Q 985,80 1105,115 Q 1225,80 1330,140" strokeWidth="1.5" />
          {/* Dikey Askı Halatları */}
          <line x1="1020" y1="95" x2="1020" y2="140" strokeDasharray="2 3" />
          <line x1="1060" y1="108" x2="1060" y2="140" strokeDasharray="2 3" />
          <line x1="1105" y1="115" x2="1105" y2="140" strokeDasharray="2 3" />
          <line x1="1150" y1="108" x2="1150" y2="140" strokeDasharray="2 3" />
          <line x1="1190" y1="95" x2="1190" y2="140" strokeDasharray="2 3" />
        </g>
      </svg>
    </div>
  );
}

export default function TVPage() {
  const auth = useAuth() || {};
  const { user, authLoading, institutionId, institutionName, logoUrl } = auth;
  const router = useRouter();

  const [students, setStudents]           = useState([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [classesCount, setClassesCount]   = useState(0);
  const [reports, setReports]             = useState([]);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [loading, setLoading]             = useState(true);
  const [lastRefresh, setLastRefresh]     = useState(new Date());
  const [hadithIdx, setHadithIdx]         = useState(0);
  const [mottoIdx, setMottoIdx]           = useState(0);
  const [hadithVisible, setHadithVisible] = useState(true);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [isMounted, setIsMounted]         = useState(false);
  const [isMobile, setIsMobile]           = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => {
      const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth < 900;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fullscreen toggle
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

  // İstemci tarafı yüklenmeden önce siyah ekran/loader göster (Hydration Mismatch engelleme)
  if (!isMounted) {
    return (
      <div style={{ minHeight: '100vh', background: '#010818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(251,191,36,0.3)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // Mobile guard — show immediately before anything else
  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #010818 0%, #05122e 50%, #010818 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Segoe UI', sans-serif",
        }}
      >
        {/* Arka plan yıldız efekti */}
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                borderRadius: '50%',
                background: 'white',
                width: `${(i % 3) + 1}px`,
                height: `${(i % 3) + 1}px`,
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 80}%`,
                opacity: 0.3 + (i % 4) * 0.1,
                animation: `twinkle ${3 + (i % 4)}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '28px',
            padding: '48px 36px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 80px rgba(0,0,0,0.6), 0 0 60px rgba(251,191,36,0.08)',
          }}
        >
          {/* Üst rozet */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: '20px',
              padding: '6px 14px',
              marginBottom: '24px',
              color: '#fbbf24',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span>📡</span>
            <span>TV Modu</span>
          </div>

          {/* İkon */}
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
              border: '2px solid rgba(251,191,36,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px',
            }}
          >
            🖥️
          </div>

          {/* Başlık */}
          <h1
            style={{
              color: '#f1f5f9',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              marginBottom: '14px',
              lineHeight: 1.3,
            }}
          >
            Bu sayfa büyük ekranlar için tasarlandı 🌟
          </h1>

          {/* Açıklama */}
          <p
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: 1.8,
              marginBottom: '28px',
            }}
          >
            TV Panosu, sınıf ekranlarında veya masaüstü bilgisayarlarda en iyi deneyimi sunar.
            Mobil cihazdan erişim bu sayfa için desteklenmemektedir.
          </p>

          {/* Bilgi kutusu */}
          <div
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <div style={{ color: '#fde68a', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              💡 Nasıl erişebilirsiniz?
            </div>
            <div style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.7 }}>
              • Sınıf akıllı tahtası veya projektörü<br />
              • Masaüstü / dizüstü bilgisayar<br />
              • Minimum <strong style={{ color: '#cbd5e1' }}>900px</strong> genişliğinde ekran
            </div>
          </div>

          {/* Geri dön butonu */}
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'linear-gradient(135deg, #1e3a5f, #2d4f7c)',
              border: '1px solid rgba(99,179,237,0.3)',
              borderRadius: '14px',
              padding: '13px 28px',
              color: '#bfdbfe',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all 0.2s',
              width: '100%',
            }}
            onMouseEnter={e => {
              e.target.style.background = 'linear-gradient(135deg, #2d4f7c, #3b6fa5)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'linear-gradient(135deg, #1e3a5f, #2d4f7c)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            ← Ana Sayfaya Dön
          </button>

          {/* Alt not */}
          <p style={{ color: '#475569', fontSize: '11px', marginTop: '18px', lineHeight: 1.6 }}>
            Anlayışınız için teşekkür ederiz 🤍
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#030a1a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={32} className="animate-spin text-amber-400" />
          <p className="text-sm font-medium text-slate-300">TV Ekranı Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Hadis ve Motto rotasyonu (12 saniyede bir)
  useEffect(() => {
    const interval = setInterval(() => {
      setHadithVisible(false);
      setTimeout(() => {
        setHadithIdx(i => (i + 1) % HADITHS.length);
        setMottoIdx(i => (i + 1) % MOTTOS.length);
        setHadithVisible(true);
      }, 500);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Canlı Veri Çekme (Kuruma Özel Gerçek Veriler)
  const fetchData = useCallback(async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const [sRes, rRes, tRes, lRes] = await Promise.all([
        fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/students/reports?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/users/list-teachers?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/leave?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
      ]);

      const [sData, rData, tData, lData] = await Promise.all([sRes.json(), rRes.json(), tRes.json(), lRes.json()]);

      let totalStudents = 0;
      if (sData.success && Array.isArray(sData.students)) {
        setStudents(sData.students);
        totalStudents = sData.students.length;
        // Benzersiz sınıf sayısı
        const uniqueClasses = new Set(sData.students.map(s => s.class).filter(Boolean));
        setClassesCount(uniqueClasses.size);
      } else {
        setStudents([]);
        setClassesCount(0);
      }

      if (rData.success && Array.isArray(rData.reports)) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setReports(rData.reports.filter(r => r.created_at && new Date(r.created_at) >= weekAgo));
      } else {
        setReports([]);
      }

      if (tData.success && Array.isArray(tData.teachers)) {
        setTeachersCount(tData.teachers.length);
      } else {
        setTeachersCount(0);
      }

      // Devam Oranı Hesabı: Kurumdaki öğrenciler arasındaki aktif izinliler düşülerek hesaplanır
      if (lData.success && Array.isArray(lData.requests) && totalStudents > 0) {
        const activeApprovedLeaves = lData.requests.filter(req => req.status === 'approved').length;
        const presentStudents = Math.max(0, totalStudents - activeApprovedLeaves);
        const computedRate = Math.round((presentStudents / totalStudents) * 100);
        setAttendanceRate(computedRate);
      } else {
        setAttendanceRate(100);
      }

      setLastRefresh(new Date());
    } catch (e) {
      console.error("TV Data Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Canlı Polling: 4 saniyede bir verileri tazele
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const skyData = useSunPosition();
  const hadith  = HADITHS[hadithIdx];
  const motto   = MOTTOS[mottoIdx];

  // Kurum Adı Parçalama (Yamanevler / Enderun Bilişim)
  const fullInstName = institutionName || 'YAMANEVLER ENDERUN BİLİŞİM';
  const nameParts = fullInstName.split(' ');
  const mainTitle = nameParts[0] || 'YAMANEVLER';
  const subTitle  = nameParts.slice(1).join(' ') || 'ENDERUN BİLİŞİM';

  return (
    <div
      className="min-h-screen text-white select-none relative overflow-hidden font-sans flex flex-col justify-between p-6 md:p-10 transition-all duration-1000"
      style={{ background: skyData.skyGradient }}
    >
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.1; transform: scale(0.8); }
          100% { opacity: 0.9; transform: scale(1.3); }
        }
        @keyframes shooting-star {
          0% { transform: translateX(0) translateY(0) rotate(-35deg); opacity: 1; width: 0px; }
          70% { opacity: 1; width: 120px; }
          100% { transform: translateX(-600px) translateY(400px) rotate(-35deg); opacity: 0; width: 0px; }
        }
        .shooting-star-1 {
          position: absolute; top: 12%; right: 25%; height: 2px;
          background: linear-gradient(90deg, rgba(255,255,255,1), transparent);
          animation: shooting-star 8s linear 1s infinite; pointer-events: none;
        }
        .shooting-star-2 {
          position: absolute; top: 20%; right: 45%; height: 1.5px;
          background: linear-gradient(90deg, rgba(56,189,248,1), transparent);
          animation: shooting-star 11s linear 5s infinite; pointer-events: none;
        }
        .hadith-transition { transition: opacity 0.5s ease, transform 0.5s ease; }
        .hadith-hidden { opacity: 0; transform: translateY(8px); }
        .hadith-visible { opacity: 1; transform: translateY(0); }
      `}</style>

      {/* Arka Plan Yıldızları */}
      <Particles isNight={skyData.isNight} />

      {/* İstanbul Şehir Silueti SVG (Geleceği Geçmişe Bağlayan Eğitim) */}
      <IstanbulSilhouetteSVG />

      {/* ─── HEADER (Üst Başlık & Logolar & Canlı Saat) ─── */}
      <div className="relative z-10 flex items-center justify-between">
        
        {/* Sol: Geri Dön + Logo + Kurum Adı */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => router.push('/')}
            title="Geri Dön"
            className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-200 transition-all active:scale-95 shadow-lg backdrop-blur-md shrink-0"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Kurum Altıgen / Kare Logosu */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shadow-2xl shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={fullInstName} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
                <Home size={28} className="text-blue-400" />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider text-white uppercase leading-none">
              {mainTitle} <span className="font-semibold text-slate-200">{subTitle}</span>
            </h1>
            <p className="text-sky-300/90 text-xs md:text-sm font-medium mt-1 tracking-wide">
              Geleceği Geçmişe Bağlayan Eğitim
            </p>
          </div>
        </div>

        {/* Sağ: Canlı Saat & Tam Ekran & Yenile */}
        <div className="flex items-center gap-5">
          <Clock />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
              className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-200 transition-all active:scale-95 backdrop-blur-md"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button
              onClick={fetchData}
              title="Yenile"
              className="p-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-slate-200 transition-all active:scale-95 backdrop-blur-md"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── ORTA ALAN (Günün Hadis-i Şerifi & İyilik Mesajı Kartı) ─── */}
      <div className="relative z-10 grid grid-cols-12 gap-6 my-6 flex-1 items-stretch">
        
        {/* SOL KUTU: Günün Hadis-i Şerifi (Görseldeki ile Birebir Aynı Tasarım) */}
        <div className="col-span-12 lg:col-span-8 bg-gradient-to-b from-[#081b3b]/80 via-[#0a234e]/70 to-[#071735]/80 backdrop-blur-xl border border-sky-500/20 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          {/* Başlık Vurgusu */}
          <div className="flex items-center justify-center gap-3 text-amber-400 font-extrabold text-xs md:text-sm tracking-[0.2em] uppercase">
            <span className="text-amber-400/60">═══➔</span>
            <BookOpen size={20} className="text-amber-400" />
            <span>GÜNÜN HADİS-İ ŞERİFİ</span>
            <span className="text-amber-400/60">⇚═══</span>
          </div>

          {/* Hadis Metni & Tırnaklar */}
          <div className={`my-auto py-6 text-center relative px-6 md:px-12 hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
            <span className="absolute top-0 left-0 text-sky-400/30 text-7xl font-serif leading-none select-none">“</span>
            <p className="text-xl md:text-2xl font-medium leading-relaxed text-slate-100 italic tracking-wide font-serif">
              {hadith.text}
            </p>
            <span className="absolute bottom-0 right-0 text-sky-400/30 text-7xl font-serif leading-none select-none">”</span>
          </div>

          {/* Kaynak */}
          <div className={`text-center pt-2 hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
            <span className="text-amber-400/90 text-sm font-bold tracking-wider">
              {hadith.source}
            </span>
          </div>

          {/* Geometrik Arka Plan Desenleri */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>

        {/* SAĞ KUTU: İyilik, Bilgide ve Sabırla İlerleyin (Görseldeki Renkli Degrade Kartı) */}
        <div className="col-span-12 lg:col-span-4 bg-gradient-to-b from-[#131c54]/90 via-[#1b1968]/85 to-[#24135e]/90 backdrop-blur-xl border border-purple-500/25 rounded-3xl p-8 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          {/* Üst Güneş / İkon Vurgusu */}
          <div className="w-16 h-16 rounded-full bg-indigo-500/15 border border-purple-400/30 flex items-center justify-center text-sky-300 mt-4 shadow-inner">
            <Sun size={32} className="text-amber-300" />
          </div>

          {/* Motto Metni */}
          <div className={`my-auto hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-4 tracking-wide">
              {motto.title}
            </h2>
            <div className="w-12 h-0.5 bg-purple-400/40 mx-auto mb-4" />
            <p className="text-slate-300 text-sm font-medium">
              {motto.sub}
            </p>
          </div>

          {/* Alt Kalp İkonu Vurgusu */}
          <div className="mb-2 text-purple-300/60">
            <Heart size={20} className="mx-auto text-purple-400/60" />
          </div>

          {/* Arka Plan Dağ / Mor İllüstrasyonu */}
          <div className="absolute bottom-0 inset-x-0 h-32 pointer-events-none opacity-20 bg-gradient-to-t from-purple-900 via-purple-800 to-transparent" />
        </div>
      </div>

      {/* ─── İSTATİSTİK KARTLARI (Kuruma Özel Canlı Gerçek Veriler) ─── */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-5">
        
        {/* 1. ÖĞRENCİ */}
        <div className="bg-[#091b3e]/70 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-14 h-14 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
            <Users size={24} className="text-blue-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <AnimatedCounter value={students.length} />
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">ÖĞRENCİ</div>
            <div className="text-[11px] text-slate-400 font-medium">Aktif öğrenci</div>
          </div>
        </div>

        {/* 2. ÖĞRETMEN */}
        <div className="bg-[#091b3e]/70 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-14 h-14 rounded-full bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <User size={24} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <AnimatedCounter value={teachersCount} />
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">ÖĞRETMEN</div>
            <div className="text-[11px] text-slate-400 font-medium">Aktif öğretmen</div>
          </div>
        </div>

        {/* 3. SINIF */}
        <div className="bg-[#091b3e]/70 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-14 h-14 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0">
            <Home size={24} className="text-purple-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <AnimatedCounter value={classesCount} />
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">SINIF</div>
            <div className="text-[11px] text-slate-400 font-medium">Toplam sınıf</div>
          </div>
        </div>

        {/* 4. DEVAM ORANI */}
        <div className="bg-[#091b3e]/70 backdrop-blur-md border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="w-14 h-14 rounded-full bg-amber-600/30 border border-amber-400/40 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} className="text-amber-400" />
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              %{attendanceRate}
            </div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">DEVAM ORANI</div>
            <div className="text-[11px] text-slate-400 font-medium">Bu hafta</div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER (İlim · İyilik · İstikrar) ─── */}
      <div className="relative z-10 pt-4 text-center border-t border-sky-500/10 mt-4">
        <div className="flex items-center justify-center gap-4 text-sky-200/70 text-xs font-bold tracking-[0.3em] uppercase">
          <span>İLİM</span>
          <span className="text-sky-400/40">•</span>
          <span>İYİLİK</span>
          <span className="text-sky-400/40">•</span>
          <span>İSTİKRAR</span>
        </div>
      </div>
    </div>
  );
}