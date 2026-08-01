'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { RefreshCw, Volume2, VolumeX, BookOpen, Star, Heart, Zap } from 'lucide-react';

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
    text: "Güzel ahlak tamamlamak üzere gönderildim.",
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

// Basit Parçacık Bileşeni
function Particles() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 8 + 4,
    delay: Math.random() * 6,
    opacity: Math.random() * 0.6 + 0.1,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="text-5xl md:text-6xl font-black text-white tracking-tight tabular-nums drop-shadow-2xl" style={{ textShadow: '0 0 40px rgba(99,179,237,0.5)' }}>
        {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        <span className="text-blue-300 text-3xl ml-1">:{String(time.getSeconds()).padStart(2, '0')}</span>
      </div>
      <div className="text-blue-200 text-sm mt-1 font-semibold">
        {time.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 30);
    const t = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(start);
    }, 50);
    return () => clearInterval(t);
  }, [value]);
  return <>{display}</>;
}

export default function TVPage() {
  const { user, institutionId, institutionName, logoUrl, primaryColor, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [hadithIdx, setHadithIdx] = useState(0);
  const [mottoIdx, setMottoIdx] = useState(0);
  const [hadithVisible, setHadithVisible] = useState(true);

  // Audio - Pure Web Audio API (yağmur + kristal kase ambient)
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Hadis rotasyonu
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

  const stopAllNodes = () => {
    nodesRef.current.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch {} });
    nodesRef.current = [];
  };

  const startAmbient = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      stopAllNodes();

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.55;
      masterGain.connect(ctx.destination);

      // --- 1. Yağmur Sesi: Beyaz Gürültü + Bandpass Filtre ---
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1200;
      rainFilter.Q.value = 0.5;

      const rainFilter2 = ctx.createBiquadFilter();
      rainFilter2.type = 'highpass';
      rainFilter2.frequency.value = 400;

      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.18;

      rainSource.connect(rainFilter);
      rainFilter.connect(rainFilter2);
      rainFilter2.connect(rainGain);
      rainGain.connect(masterGain);
      rainSource.start();
      nodesRef.current.push(rainSource);

      // --- 2. Kristal Kase (Singing Bowl) Harmonikleri ---
      const bowFreqs = [
        { freq: 220, gain: 0.06, vibrato: 0.8 },
        { freq: 330, gain: 0.04, vibrato: 1.1 },
        { freq: 440, gain: 0.03, vibrato: 0.6 },
        { freq: 528, gain: 0.025, vibrato: 0.9 },
        { freq: 660, gain: 0.015, vibrato: 1.3 },
      ];

      bowFreqs.forEach(({ freq, gain, vibrato }, i) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();

        // Hafif vibrato ile canlı hissiyat
        lfo.type = 'sine';
        lfo.frequency.value = vibrato;
        lfoGain.gain.value = 1.5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.type = 'sine';
        osc.frequency.value = freq;
        gainNode.gain.value = gain;

        // Yavaş nefes eden volume (LFO ile)
        const volLfo = ctx.createOscillator();
        const volLfoGain = ctx.createGain();
        volLfo.type = 'sine';
        volLfo.frequency.value = 0.12 + i * 0.03;
        volLfoGain.gain.value = gain * 0.5;
        volLfo.connect(volLfoGain);
        volLfoGain.connect(gainNode.gain);
        volLfo.start();

        osc.connect(gainNode);
        gainNode.connect(masterGain);
        osc.start();
        nodesRef.current.push(osc, lfo, volLfo);
      });

      // --- 3. Derin Sub-bass Pedal (hafif zemin hissi) ---
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.value = 55;
      bassGain.gain.value = 0.04;
      bass.connect(bassGain);
      bassGain.connect(masterGain);
      bass.start();
      nodesRef.current.push(bass);

    } catch (e) {
      console.warn('Ambient audio error:', e);
    }
  };

  const toggleAudio = () => {
    if (isPlaying) {
      stopAllNodes();
      if (audioCtxRef.current) {
        audioCtxRef.current.suspend();
      }
      setIsPlaying(false);
    } else {
      startAmbient();
      setIsPlaying(true);
    }
  };

  // Sayfa kapandığında temizle
  useEffect(() => () => stopAllNodes(), []);

  const fetchData = useCallback(async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/students/reports?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
      ]);
      const [sData, rData] = await Promise.all([sRes.json(), rRes.json()]);
      if (sData.success && sData.students) setStudents(sData.students);
      if (rData.success && rData.reports) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setReports(rData.reports.filter(r => r.created_at && new Date(r.created_at) >= weekAgo));
      }
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [institutionId]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);
  useEffect(() => {
    const t = setInterval(() => { if (user) fetchData(); }, 20000);
    return () => clearInterval(t);
  }, [user, fetchData]);

  const catCounts = {};
  reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  const recentReports = [...reports].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 10);
  const hadith = HADITHS[hadithIdx];
  const motto = MOTTOS[mottoIdx];

  return (
    <div className="min-h-screen text-white select-none relative overflow-hidden font-sans flex flex-col"
      style={{ background: 'linear-gradient(180deg, #020c1e 0%, #041530 25%, #061d40 50%, #071a35 75%, #030d1f 100%)' }}>


      {/* CSS Animasyonları */}
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.1; transform: scale(0.8); }
          100% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(-2deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,179,237,0.3), 0 0 60px rgba(99,179,237,0.1); }
          50% { box-shadow: 0 0 40px rgba(99,179,237,0.6), 0 0 100px rgba(99,179,237,0.2); }
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
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-marquee { animation: marquee 40s linear infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        .animate-breathe { animation: breathe 4s ease-in-out infinite; }
        .hadith-transition { transition: opacity 0.6s ease, transform 0.6s ease; }
        .hadith-hidden { opacity: 0; transform: translateY(10px); }
        .hadith-visible { opacity: 1; transform: translateY(0); }
        .shimmer-text {
          background: linear-gradient(90deg, #93c5fd 0%, #e2e8f0 40%, #bfdbfe 60%, #93c5fd 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* Yıldızlar */}
      <Particles />

      {/* Arka Plan Orb'ları */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)', animation: 'float-slow 12s ease-in-out infinite' }} />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', animation: 'float-medium 10s ease-in-out infinite 2s' }} />
        <div className="absolute bottom-[5%] left-[20%] w-[700px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', animation: 'float-slow 15s ease-in-out infinite 4s' }} />
      </div>

      {/* Dağ Silueti */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '220px' }}>
        <svg viewBox="0 0 1440 220" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mtnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#020c1e" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="mtnGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f2744" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020c1e" stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Arka dağlar */}
          <path d="M0,220 L0,160 L120,90 L240,130 L380,60 L500,110 L620,40 L740,100 L860,30 L980,90 L1100,50 L1220,110 L1340,70 L1440,120 L1440,220 Z" fill="url(#mtnGrad)" />
          {/* Ön dağlar */}
          <path d="M0,220 L0,190 L100,150 L200,175 L320,130 L430,160 L560,110 L670,150 L780,125 L890,155 L1000,120 L1120,160 L1240,130 L1360,165 L1440,140 L1440,220 Z" fill="url(#mtnGrad2)" />
          {/* Ufuk parıltısı */}
          <ellipse cx="720" cy="50" rx="280" ry="35" fill="rgba(251,146,60,0.12)" />
          <ellipse cx="720" cy="55" rx="180" ry="22" fill="rgba(251,191,36,0.08)" />
        </svg>
      </div>

      {/* === HEADER === */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6 pb-4">
        {/* Logo + Kurum Adı */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-2xl animate-pulse-glow">
            <img src={logoUrl || '/logo.png'} alt={institutionName} className="w-full h-full object-contain p-1.5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight shimmer-text">
              {institutionName || 'Kurumsal Raporlama'}
            </h1>
            <p className="text-blue-300/70 text-sm mt-0.5 font-medium">Birlikte öğreniyor, birlikte gelişiyoruz.</p>
          </div>
        </div>

        {/* Sağ: Ses + Saat */}
        <div className="flex items-center gap-6">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-bold text-sm border transition-all duration-300 ${
              isPlaying
                ? 'bg-gradient-to-r from-emerald-600/80 to-teal-600/80 border-emerald-400/40 text-white shadow-lg shadow-emerald-900/40 animate-breathe'
                : 'bg-white/8 border-white/15 text-blue-200 hover:bg-white/15'
            }`}
          >
            {isPlaying
              ? <Volume2 size={18} className="text-emerald-200" />
              : <VolumeX size={18} className="text-blue-300" />
            }
            <span>{isPlaying ? 'Ses Açık' : 'Dinlendirici Ses'}</span>
          </button>
          <Clock />
          <button onClick={fetchData} className="p-3 bg-white/8 hover:bg-white/15 border border-white/15 rounded-xl transition-all active:scale-95">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* === ANA İÇERİK === */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-5 px-8 pb-4" style={{ minHeight: 0 }}>

        {/* SOL: Öğrenci Sayacı */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Dairesel Gösterge */}
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 60px rgba(0,0,0,0.4)' }}>

            {/* Dönen Çember */}
            <div className="relative flex items-center justify-center mb-4" style={{ width: 160, height: 160 }}>
              {/* Dış dönen halka */}
              <svg className="absolute inset-0 w-full h-full" style={{ animation: 'ring-rotate 8s linear infinite' }}>
                <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(99,179,237,0.2)" strokeWidth="1.5" strokeDasharray="6 4" />
                <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(99,179,237,0.6)" strokeWidth="2" strokeDasharray="30 424" strokeLinecap="round" />
              </svg>
              {/* İç parlayan çember */}
              <svg className="absolute inset-0 w-full h-full" style={{ animation: 'ring-counter 12s linear infinite' }}>
                <circle cx="80" cy="80" r="58" fill="none" stroke="rgba(167,139,250,0.3)" strokeWidth="1" strokeDasharray="4 8" />
              </svg>
              {/* Merkez */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="text-6xl font-black text-white" style={{ textShadow: '0 0 30px rgba(99,179,237,0.8)' }}>
                  <AnimatedCounter value={students.length} />
                </div>
                <div className="text-blue-300 text-xs font-bold tracking-widest uppercase mt-1">Aktif Öğrenci</div>
              </div>
            </div>

            {/* Sistem Aktif */}
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 relative" />
              Sistem Aktif
            </div>

            {/* Arka plan efekt */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)', filter: 'blur(20px)' }} />
            </div>
          </div>

          {/* Bu Hafta Rapor */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 text-center"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            <div className="text-3xl font-black text-white mb-1"><AnimatedCounter value={reports.length} /></div>
            <div className="text-blue-300 text-xs font-bold uppercase tracking-widest">Bu Hafta Rapor</div>
          </div>
        </div>

        {/* ORTA: Hadis-i Şerif */}
        <div className="col-span-6">
          <div className="h-full bg-gradient-to-b from-white/8 to-white/3 backdrop-blur-2xl border border-white/12 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden animate-float-slow"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 30px 80px rgba(0,0,0,0.5)' }}>

            {/* Başlık */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center mb-3 animate-breathe">
                <BookOpen size={20} className="text-amber-400" />
              </div>
              <div className="text-amber-400 text-xs font-black tracking-[0.2em] uppercase">Günün Hadis-i Şerifi</div>
            </div>

            {/* Hadis Metni */}
            <div className={`flex-1 flex items-center justify-center hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              <div className="text-center">
                <div className="text-amber-300/40 text-6xl font-serif leading-none mb-2 -mt-4">"</div>
                <p className="text-lg md:text-xl font-semibold leading-relaxed text-blue-50 font-serif italic"
                  style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                  {hadith.text}
                </p>
                <div className="text-amber-300/40 text-6xl font-serif leading-none mt-2">"</div>
              </div>
            </div>

            {/* Kaynak */}
            <div className={`pt-4 border-t border-white/10 flex justify-center hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              <span className="text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-4 py-1.5 rounded-full tracking-wider">
                {hadith.source}
              </span>
            </div>

            {/* Hadis Sayfa Noktaları */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {HADITHS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${i === hadithIdx ? 'w-5 h-2 bg-amber-400' : 'w-2 h-2 bg-white/20'}`} />
              ))}
            </div>

            {/* Dekoratif arka plan */}
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
              style={{ background: 'radial-gradient(circle at top right, rgba(251,191,36,0.08) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
              style={{ background: 'radial-gradient(circle at bottom left, rgba(37,99,235,0.1) 0%, transparent 70%)' }} />
          </div>
        </div>

        {/* SAĞ: Motto + İstatistik */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Motto Kartı */}
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden animate-float-medium"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            <div className="flex justify-end mb-4">
              <Heart size={22} className="text-pink-400 animate-breathe" />
            </div>
            <div className={`hadith-transition ${hadithVisible ? 'hadith-visible' : 'hadith-hidden'}`}>
              <h3 className="text-xl font-black text-white leading-snug mb-3"
                style={{ textShadow: '0 0 30px rgba(99,179,237,0.4)' }}>
                {motto.title}
              </h3>
              <div className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-transparent mb-3" />
              <p className="text-blue-300/80 text-sm font-medium leading-relaxed">{motto.sub}</p>
            </div>
            <div className="mt-auto pt-4">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Günün Mesajı</div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ background: 'radial-gradient(circle at 30% 30%, rgba(167,139,250,0.08) 0%, transparent 60%)' }} />
          </div>

          {/* En Çok Kategori */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>
            <div className="text-xs font-black text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Star size={12} className="text-amber-400" /> Kategori Özeti
            </div>
            <div className="space-y-2">
              {Object.entries(catCounts).slice(0, 3).map(([cat, cnt]) => (
                <div key={cat} className="flex justify-between items-center text-xs">
                  <span className="text-blue-200 font-semibold">{cat}</span>
                  <span className="text-white font-black bg-white/10 px-2 py-0.5 rounded-lg">{cnt}</span>
                </div>
              ))}
              {Object.keys(catCounts).length === 0 && (
                <p className="text-xs text-blue-300/50 text-center py-2">Henüz rapor yok</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ALT: 3 Kart Satırı */}
      <div className="relative z-10 grid grid-cols-3 gap-5 px-8 pb-4">
        {[
          { icon: <BookOpen size={28} className="text-violet-400" />, color: 'rgba(124,58,237,0.2)', border: 'rgba(124,58,237,0.3)', title: 'Öğren', sub: 'Her gün yeni bir bilgi, geleceğe atılan bir adımdır.' },
          { icon: <Heart size={28} className="text-teal-400" />, color: 'rgba(20,184,166,0.2)', border: 'rgba(20,184,166,0.3)', title: 'Paylaş', sub: 'İyiliği paylaş, çoğalmasına vesile ol.' },
          { icon: <Star size={28} className="text-amber-400" />, color: 'rgba(245,158,11,0.2)', border: 'rgba(245,158,11,0.3)', title: 'Geliş', sub: 'Kendini geliştir, çevrene değer kat.' },
        ].map((card, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/8 transition-all duration-300"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 animate-breathe"
              style={{ background: card.color, border: `1px solid ${card.border}`, animationDelay: `${i * 0.5}s` }}>
              {card.icon}
            </div>
            <div>
              <div className="text-white font-black text-base">{card.title}</div>
              <div className="text-blue-300/70 text-xs font-medium mt-0.5 leading-relaxed">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ALT: Canlı Ticker */}
      <div className="relative z-10 mx-8 mb-4 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden flex items-center"
        style={{ height: 44 }}>
        <div className="bg-blue-600 text-white text-[10px] font-black tracking-widest uppercase px-4 py-2 flex items-center gap-2 shrink-0 h-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          CANLI
        </div>
        <div className="flex-1 overflow-hidden h-full flex items-center">
          <div className="whitespace-nowrap animate-marquee text-xs text-blue-100 font-medium flex items-center gap-6">
            {recentReports.length > 0 ? recentReports.map((r, i) => (
              <span key={r.id || i} className="inline-flex items-center gap-2">
                <span className="font-bold text-amber-300">{r.student_name || 'Öğrenci'}</span>
                <span className="text-white/80">{r.content?.slice(0, 60)}{r.content?.length > 60 ? '...' : ''}</span>
                <span className="bg-white/10 text-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">{r.category}</span>
                <span className="text-blue-500 mx-2">◆</span>
              </span>
            )) : (
              <span className="text-blue-300/60">Sistem aktif · Öğrenci takip ve raporlama portalı çalışıyor · Yeni raporlar buraya anlık yansıyacak</span>
            )}
          </div>
        </div>
        <div className="text-blue-400/50 text-[10px] font-mono px-4 shrink-0">
          {lastRefresh.toLocaleTimeString('tr-TR')}
        </div>
      </div>

      {/* En Alt Footer */}
      <div className="relative z-10 pb-3 text-center">
        <div className="flex items-center justify-center gap-4 text-blue-300/50 text-xs font-black tracking-[0.25em] uppercase">
          <span>İlim</span>
          <span className="text-blue-400/30">•</span>
          <span>İyilik</span>
          <span className="text-blue-400/30">•</span>
          <span>İstikrar</span>
        </div>
      </div>
    </div>
  );
}
