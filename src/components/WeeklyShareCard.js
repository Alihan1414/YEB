import React from 'react';
import { Trophy, Star, Sunrise, BookOpen, FileText } from 'lucide-react';

export default function WeeklyShareCard({ stats, institutionName, dateRange, cardRef }) {
  if (!stats) return null;

  const topClasses = stats.topClasses || [];
  const topStudents = stats.topStudents || [];

  return (
    <div className="absolute -left-[9999px] top-0">
      <div
        ref={cardRef}
        className="w-[500px] bg-gradient-to-br from-[#0a1628] via-[#06429c] to-[#011c4d] text-white p-8 rounded-[40px] shadow-2xl flex flex-col gap-6 border-4 border-blue-500/20"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex w-12 h-12 bg-white/10 rounded-2xl items-center justify-center p-2.5 mb-2 border border-white/10">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-300" fill="currentColor">
              <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
            </svg>
          </div>
          <h2 className="text-xl font-black tracking-wide uppercase text-white">{institutionName || 'Kurumsal Rapor'}</h2>
          <p className="text-blue-300 text-xs font-semibold tracking-wider uppercase">HAFTALIK BAŞARI TABLOSU</p>
          <div className="text-[10px] text-blue-200/60 font-medium mt-1 bg-white/5 py-1 px-3 rounded-full inline-block">
            {dateRange}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/5 text-center">
            <div className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">Toplam</div>
            <div className="text-xl font-black text-white">{stats.weeklyReportsCount || 0}</div>
            <div className="text-[8px] text-blue-200/50 mt-0.5">Rapor</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/5 text-center">
            <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Namaz</div>
            <div className="text-xl font-black text-emerald-400">{stats.weeklyNamazCount || 0}</div>
            <div className="text-[8px] text-emerald-400/50 mt-0.5">Kayıt</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 border border-white/5 text-center">
            <div className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Akademik</div>
            <div className="text-xl font-black text-violet-400">{stats.weeklyAkademikCount || 0}</div>
            <div className="text-[8px] text-violet-400/50 mt-0.5">Rapor</div>
          </div>
        </div>

        {/* Top Classes */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-400" /> Haftanın En Başarılı Sınıfları
          </h3>
          <div className="space-y-2">
            {topClasses.slice(0, 3).map((cls, i) => (
              <div
                key={cls.name}
                className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                  i === 0
                    ? 'bg-gradient-to-r from-amber-400/20 to-orange-500/20 border-amber-500/30'
                    : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="font-extrabold text-sm text-white">{cls.name}</span>
                </div>
                <span className="text-xs font-black text-amber-300">{cls.score} Puan</span>
              </div>
            ))}
            {topClasses.length === 0 && (
              <p className="text-xs text-blue-200/50 text-center py-2">Henüz veri yok.</p>
            )}
          </div>
        </div>

        {/* Top Students */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-widest text-blue-300 flex items-center gap-1.5">
            <Star size={14} className="text-yellow-400" /> Haftanın Öne Çıkan Öğrencileri
          </h3>
          <div className="space-y-2">
            {topStudents.map((st, i) => (
              <div
                key={st.id || i}
                className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-blue-300 w-4">#{i + 1}</span>
                  <div>
                    <div className="font-extrabold text-sm text-white">{st.name}</div>
                    <div className="text-[10px] text-blue-300/70">{st.class}</div>
                  </div>
                </div>
                <span className="text-xs font-black text-yellow-400">{st.score} Puan</span>
              </div>
            ))}
            {topStudents.length === 0 && (
              <p className="text-xs text-blue-200/50 text-center py-2">Henüz veri yok.</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 my-1" />

        {/* Branding Footer */}
        <div className="text-center text-[10px] text-blue-200/40 font-semibold tracking-wider uppercase">
          © 2026 {institutionName || 'Kurumsal Rapor'} · ENDERUN RAPOR TAKİP SİSTEMİ
        </div>
      </div>
    </div>
  );
}
