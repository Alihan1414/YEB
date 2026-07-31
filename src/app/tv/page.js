'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Trophy, Sunrise, BookOpen, FileText, RefreshCw,
  GraduationCap, Utensils, ClipboardList, Heart, Loader2
} from 'lucide-react';

const CATEGORY_COLORS = {
  Akademik: '#8b5cf6', Yemek: '#f59e0b',
  Program:  '#06b6d4', Sağlık: '#ef4444',
  Namaz: '#10b981',   Diğer: '#6b7280',
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
      <div className="text-4xl font-black text-white tracking-tight tabular-nums">
        {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="text-blue-200 text-sm mt-1">
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

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { if (user) fetchData(); }, 30000);
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
  const recentReports = [...reports].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
      <Loader2 size={48} className="text-blue-400 animate-spin" />
    </div>
  );

  const pc = primaryColor || '#06429c';

  return (
    <div
      className="min-h-screen text-white p-8 flex flex-col gap-8 select-none"
      style={{ background: `linear-gradient(135deg, #0a1628 0%, ${pc} 50%, #011c4d 100%)` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-2xl overflow-hidden shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full rounded-xl flex items-center justify-center font-black text-2xl text-white" style={{ backgroundColor: pc }}>
                {(institutionName || 'K')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="text-2xl font-black tracking-wide">{institutionName || 'Kurumsal Dashboard'}</div>
            <div className="text-blue-200 text-sm">Öğrenci Takip Sistemi · Canlı Dashboard</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Clock />
          <button
            onClick={fetchData}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
            title="Yenile"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6">
        {/* Left — Stats */}
        <div className="col-span-4 space-y-4">
          {/* Toplam */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
            <div className="text-xs font-black uppercase tracking-widest text-blue-200 mb-2">Bu Hafta Toplam</div>
            <div className="text-6xl font-black">{reports.length}</div>
            <div className="text-blue-200 text-sm mt-1">rapor girildi</div>
          </div>

          {/* Kategori Sayımları */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-3">
            <div className="text-xs font-black uppercase tracking-widest text-blue-200">Kategori Dağılımı</div>
            {Object.entries(catCounts).map(([cat, cnt]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm font-semibold">{cat}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full" style={{ width: `${Math.min(cnt * 12, 80)}px`, backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }} />
                  <span className="text-sm font-black w-6 text-right">{cnt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center — Haftanın Sınıfları */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-blue-200">🏆 Haftanın Sınıf Sıralaması</div>
          {topClasses.map(([cls, score], i) => (
            <div key={cls}
              className={`rounded-3xl p-6 border flex items-center gap-5 ${
                i === 0
                  ? 'bg-gradient-to-r from-amber-400/80 to-orange-500/80 border-amber-300/30 shadow-xl'
                  : i === 1
                    ? 'bg-white/15 border-white/15'
                    : 'bg-white/8 border-white/10'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl ${
                i === 0 ? 'bg-white/30' : 'bg-white/10'
              }`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </div>
              <div className="flex-1">
                <div className="text-3xl font-black">{cls}</div>
                <div className={`text-sm mt-0.5 ${i === 0 ? 'text-amber-100' : 'text-blue-200'}`}>{score} puan</div>
              </div>
            </div>
          ))}
          {topClasses.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-blue-300 text-sm">
              Bu hafta henüz rapor girilmedi.
            </div>
          )}
        </div>

        {/* Right — Program ve İlim Meclisleri Hadis-i Şerif */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-blue-200 flex items-center gap-2">
            <span>✨</span> Hadis-i Şerif
          </div>
          <div className="bg-gradient-to-br from-emerald-500/20 via-blue-600/20 to-purple-600/20 backdrop-blur-md rounded-3xl p-7 border border-white/20 flex flex-col justify-between flex-1 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 opacity-10 text-white font-serif text-9xl select-none pointer-events-none">
              📖
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-2xl shadow-inner">
                🕌
              </div>
              <p className="text-lg md:text-xl font-serif italic leading-relaxed text-blue-50 font-medium tracking-wide">
                &ldquo;Bir topluluk Allah&apos;ın evlerinden bir evde toplanır, Allah&apos;ın kitabını okur ve onu aralarında müzakere ederlerse, üzerlerine sekîne (huzur) iner, onları rahmet kaplar, melekler etraflarını kuşatır ve Allah onları kendi katındakilerin arasında anar.&rdquo;
              </p>
            </div>

            <div className="pt-6 border-t border-white/10 relative z-10 flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-wider text-amber-300 uppercase">Programlara İştirak &amp; İlim Meclisleri</span>
              <span className="text-xs text-blue-200 font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/10">Müslim, Zikir 38</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-blue-300/60 text-xs">
        <span>Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}</span>
        <span>Otomatik yenileme: 30 saniyede bir · <a href="/" className="underline hover:text-white">← Geri dön</a></span>
      </div>
    </div>
  );
}
