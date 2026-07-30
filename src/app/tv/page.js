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
  const { user, institutionId, institutionName, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const [announcements, setAnnouncements] = useState([
    "📢 ÖNEMLİ DUYURU: Bu hafta dereceye giren sınıflar ve haftalık performans puanları canlı olarak panoda ilan edilmektedir.",
    "🔔 İZİN BİLGİLENDİRMESİ: Öğrenci izin başvuruları veliler tarafından doğrudan dijital form üzerinden iletilebilir.",
    "⭐ AKADEMİK & NAMAZ TAKİBİ: Günlük raporlar öğretmenlerimiz tarafından anlık işlenmekte ve veli bilgilendirme sistemiyle paylaşılmaktadır.",
    "🏆 TEBRİKLER: Tüm öğrencilerimize derslerinde ve haftalık çalışmalarda üstün başarılar dileriz."
  ]);
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  const fetchData = useCallback(async () => {
    const instId = institutionId || 'yamanevler';
    try {
      const [sRes, rRes, aRes] = await Promise.all([
        fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/students/reports?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
        fetch(`/api/admin/announcements?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' }),
      ]);
      const [sData, rData, aData] = await Promise.all([sRes.json(), rRes.json(), aRes.json()]);
      if (sData.success && sData.students) setStudents(sData.students);
      if (rData.success && rData.reports) {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        setReports(rData.reports.filter(r => r.created_at && new Date(r.created_at) >= weekAgo));
      }
      if (aData.success && aData.announcements && aData.announcements.length > 0) {
        setAnnouncements(aData.announcements);
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

  useEffect(() => {
    if (announcements.length === 0) return;
    const timer = setInterval(() => {
      setAnnouncementIndex(prev => (prev + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
      <Loader2 size={48} className="text-blue-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#06429c] to-[#011c4d] text-white p-6 md:p-8 flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-2xl overflow-hidden border border-white/20">
            <img src="/cover.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-wide">Talebe takip ve raporlama sistemi</div>
            <div className="text-blue-200 text-sm font-semibold">{institutionName || 'Yamanevler Enderun'} · TV Canlı Dashboard</div>
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

      {/* 📢 ÖNEMLİ DUYURULAR PANOSU (Dinamik Canlı Duyuru Bandı) */}
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-400/40 rounded-3xl p-4 md:p-5 shadow-2xl backdrop-blur-md relative overflow-hidden flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shrink-0 shadow-lg animate-pulse">
          <span className="text-base">📢</span> ÖNEMLİ DUYURU
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="text-sm md:text-base font-bold text-amber-100 transition-all duration-500 ease-in-out truncate">
            {announcements[announcementIndex]}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {announcements.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setAnnouncementIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${idx === announcementIndex ? 'bg-amber-400 w-6' : 'bg-white/30'}`}
            />
          ))}
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

        {/* Right — Son Raporlar */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-blue-200">📋 Son Raporlar</div>
          <div className="space-y-3 flex-1">
            {recentReports.map((rep, i) => {
              const st = studentMap[rep.student_id];
              const color = CATEGORY_COLORS[rep.category] || '#6b7280';
              return (
                <div key={rep.id || i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{rep.student_name || (st ? `${st.name} ${st.surname}` : '?')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${color}30`, color }}>
                      {rep.category}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 line-clamp-2">{rep.content}</p>
                </div>
              );
            })}
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
