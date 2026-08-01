'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Trophy, Sunrise, BookOpen, FileText, RefreshCw, Volume2, VolumeX,
  GraduationCap, Utensils, ClipboardList, Heart, Loader2, Sparkles, Activity
} from 'lucide-react';

const CATEGORY_COLORS = {
  Akademik: '#8b5cf6', Yemek: '#f59e0b',
  Program:  '#06b6d4', Sağlık: '#ef4444',
  Namaz: '#10b981',   Diğer: '#3b82f6',
};
const CATEGORY_SCORES = {
  Akademik: 3, Namaz: 2, Program: 2, Sağlık: 1, Yemek: 1, Diğer: 1,
};

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="text-3xl md:text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
        {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-blue-200 text-xs md:text-sm mt-0.5 font-medium">
        {time.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );
}

export default function TVPage() {
  const { user, institutionId, institutionName, logoUrl, primaryColor, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Audio / Sound state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Ambient Web Audio synth fallback if audio file isn't available
  const startSynthNey = () => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn("Audio Context init warning:", e);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        startSynthNey();
        audioRef.current.play().then(() => {
          setIsPlayingAudio(true);
        }).catch(err => {
          console.warn("Audio play blocked by browser:", err);
          setIsPlayingAudio(true);
        });
      }
    } else {
      setIsPlayingAudio(!isPlayingAudio);
      startSynthNey();
    }
  };

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

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => { if (user) fetchData(); }, 20000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  // Compute stats
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const classScores = {};
  reports.forEach(r => {
    const st = studentMap[r.student_id];
    const cls = st?.class || r.class_name || '?';
    classScores[cls] = (classScores[cls] || 0) + (CATEGORY_SCORES[r.category] || 1);
  });
  const topClasses = Object.entries(classScores).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const catCounts = {};
  reports.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  const recentReports = [...reports].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 8);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center text-white">
      <Loader2 size={48} className="text-blue-400 animate-spin mb-4" />
      <div className="text-sm font-semibold tracking-wider text-blue-200">CANLI TV EKRANI YÜKLENİYOR...</div>
    </div>
  );

  const pc = primaryColor || '#06429c';

  return (
    <div
      className="min-h-screen text-white p-6 md:p-8 flex flex-col justify-between select-none relative overflow-hidden font-sans"
      style={{ background: `radial-gradient(circle at 50% 0%, ${pc}dd 0%, #06152d 60%, #020b18 100%)` }}
    >
      {/* Background Spiritual Ambient Audio */}
      <audio
        ref={audioRef}
        loop
        src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=meditation-spiritual-ambient-112285.mp3"
      />

      {/* Animated Floating Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-500/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-10 right-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl overflow-hidden shrink-0 border border-white/20">
            <img src={logoUrl || '/logo.png'} alt={institutionName || 'Logo'} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{institutionName || 'Kurumsal Raporlama'}</h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> CANLI
              </span>
            </div>
            <div className="text-blue-200/80 text-xs md:text-sm mt-0.5 font-medium flex items-center gap-2">
              <span>Öğrenci Gelişim & Takip Ekranı</span>
              <span>•</span>
              <span className="text-blue-300 font-bold">{students.length} Kayıtlı Öğrenci</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Fon Müziği / İlahi Sesi Butonu */}
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all shadow-lg border ${
              isPlayingAudio
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/40 shadow-emerald-900/30 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-blue-100 border-white/20'
            }`}
            title="Sesi Aç/Kapat"
          >
            {isPlayingAudio ? <Volume2 size={18} className="text-emerald-200" /> : <VolumeX size={18} className="text-slate-300" />}
            <span>{isPlayingAudio ? 'Fon Müziği Açık 🎵' : 'Dinlendirici Sesi Aç 🎵'}</span>
          </button>

          <Clock />

          <button
            onClick={fetchData}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/15 shadow-md active:scale-95"
            title="Yenile"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="relative z-10 flex-1 grid grid-cols-12 gap-6 my-6">
        {/* Left Column — Stats & Categories */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-5">
          {/* Bu Hafta Toplam Rapor */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-2xl flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-blue-200 mb-1">Bu Hafta Toplam Rapor</div>
              <div className="text-5xl font-black text-white tracking-tight">{reports.length}</div>
              <div className="text-blue-200/70 text-xs mt-1 font-medium">aktif rapor girildi</div>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              <Activity size={32} />
            </div>
          </div>

          {/* Kategori Dağılımı */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/15 shadow-2xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-black uppercase tracking-widest text-blue-200 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" /> Kategori Dağılımı
              </div>
              <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded-full text-blue-200 font-semibold border border-white/10">Son 7 Gün</span>
            </div>

            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {Object.keys(CATEGORY_COLORS).map(cat => {
                const cnt = catCounts[cat] || 0;
                const pct = reports.length > 0 ? Math.round((cnt / reports.length) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-2 text-slate-100">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                        {cat}
                      </span>
                      <span className="text-blue-200">{cnt} adet (%{pct})</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-1000 shadow-sm"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column — Haftanın Sınıf Sıralaması */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-blue-200 flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" /> 🏆 Haftanın Sınıf Sıralaması
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-between">
            {topClasses.map(([cls, score], i) => (
              <div
                key={cls}
                className={`rounded-3xl p-5 border flex items-center gap-4 transition-all duration-300 ${
                  i === 0
                    ? 'bg-gradient-to-r from-amber-500/30 via-orange-500/20 to-amber-600/30 border-amber-400/40 shadow-2xl scale-[1.02]'
                    : i === 1
                      ? 'bg-white/12 border-white/20 shadow-xl'
                      : 'bg-white/8 border-white/10 shadow-lg'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-md ${
                  i === 0 ? 'bg-amber-400/30 text-amber-200 border border-amber-300/40' : 'bg-white/15 text-white'
                }`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl md:text-3xl font-black tracking-tight text-white">{cls} Sınıfı</div>
                  <div className={`text-xs font-bold mt-0.5 ${i === 0 ? 'text-amber-300' : 'text-blue-200'}`}>
                    {score} Toplam Performans Puanı
                  </div>
                </div>
              </div>
            ))}

            {topClasses.length === 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10 flex flex-col items-center justify-center flex-1 text-center">
                <Trophy size={40} className="text-amber-400/50 mb-3" />
                <div className="text-sm font-bold text-blue-200">Bu hafta henüz rapor girilmedi</div>
                <p className="text-xs text-blue-300/60 mt-1">Sisteme rapor eklendikçe sıralama anında güncellenir.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Hadis-i Şerif & Manevi Huzur Paneli */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-blue-200 flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-400" /> Hadis-i Şerif &amp; Manevi Reçete
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 via-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/20 flex flex-col justify-between flex-1 shadow-2xl relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-2xl shadow-inner">
                🕌
              </div>
              <p className="text-base md:text-lg font-serif italic leading-relaxed text-blue-50 font-medium tracking-wide drop-shadow-sm">
                &ldquo;Bir topluluk Allah&apos;ın evlerinden bir evde toplanır, Allah&apos;ın kitabını okur ve onu aralarında müzakere ederlerse, üzerlerine sekîne (huzur) iner, onları rahmet kaplar, melekler etraflarını kuşatır ve Allah onları kendi katındakilerin arasında anar.&rdquo;
              </p>
            </div>

            <div className="pt-5 border-t border-white/15 relative z-10 flex items-center justify-between mt-4">
              <span className="text-xs font-extrabold tracking-wider text-amber-300 uppercase">İlim Meclisleri ve Rehberlik</span>
              <span className="text-[11px] text-blue-200 font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10">Müslim, Zikir 38</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Scrolling Ticker Bar at Bottom */}
      <div className="relative z-10 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 overflow-hidden">
        <div className="flex items-center gap-2 bg-blue-600 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-xl shrink-0 shadow-md">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" /> CANLI AKIŞ
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="whitespace-nowrap flex items-center gap-8 animate-marquee font-medium text-xs text-blue-100">
            {recentReports.length > 0 ? recentReports.map((r, idx) => (
              <span key={r.id || idx} className="inline-flex items-center gap-2">
                <span className="font-bold text-amber-300">{r.student_name || 'Öğrenci'}:</span>
                <span className="text-white/90">{r.content}</span>
                <span className="text-[10px] bg-white/15 text-blue-200 px-2 py-0.5 rounded-md font-semibold">{r.category}</span>
                <span className="text-blue-400 mx-2">•</span>
              </span>
            )) : (
              <span>Sistem canlı olarak çalışıyor · Öğrenci takip ve raporlama portalı aktif</span>
            )}
          </div>
        </div>

        <div className="text-blue-300/70 text-[11px] font-mono shrink-0">
          Son Güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
        </div>
      </div>
    </div>
  );
}
