'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import {
  Trophy, ArrowLeft, Calendar, Loader2, Sparkles, Printer, Share2,
  CheckCircle, Target, Sunrise, BookOpen, User, Flame, LogOut, TrendingUp, Tv, Settings
} from 'lucide-react';
import WeeklyShareCard from '@/components/WeeklyShareCard';
import Sidebar, { MobileHeader } from '@/components/Sidebar';

export default function WeeklySummaryPage() {
  const { user, role, institutionId, institutionName, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Target tracking state
  const [weeklyTarget, setWeeklyTarget] = useState(50);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('50');

  // AI Summary state
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Sharing ref
  const cardRef = useRef(null);

  // Leave active state
  const [leaveEnabled, setLeaveEnabled] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // Load stats
  useEffect(() => {
    if (user) {
      fetchWeeklySummary();
      // Load weekly target from localStorage if present
      const savedTarget = localStorage.getItem(`weeklyTarget_${institutionId || 'yamanevler'}`);
      if (savedTarget) {
        setWeeklyTarget(parseInt(savedTarget, 10));
        setTargetInput(savedTarget);
      }
      // Load leave settings
      const instId = institutionId || 'yamanevler';
      fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (d.success && d.settings) setLeaveEnabled(!!d.settings.enabled); })
        .catch(() => {});
    }
  }, [user, institutionId]);

  const fetchWeeklySummary = async () => {
    setLoading(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/students/weekly-summary?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error("fetchWeeklySummary error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTarget = () => {
    const val = parseInt(targetInput, 10);
    if (!isNaN(val) && val > 0) {
      setWeeklyTarget(val);
      localStorage.setItem(`weeklyTarget_${institutionId || 'yamanevler'}`, val.toString());
      setEditingTarget(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!stats) return;
    setAiLoading(true);
    setAiSummary('');
    try {
      const res = await fetch('/api/ai/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, institutionName }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary(data.summary);
      } else {
        setAiSummary("AI değerlendirme raporu şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyiniz.");
      }
    } catch (e) {
      console.error(e);
      setAiSummary("Bağlantı hatası sebebiyle AI raporu yüklenemedi.");
    } finally {
      setAiLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = async () => {
    if (!cardRef.current || !stats) return;
    try {
      // Temporarily scroll to top or position properly for html2canvas
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0a1628',
      });
      const dataUrl = canvas.toDataURL('image/png');
      
      // Create a temporary link to download
      const link = document.createElement('a');
      link.download = `haftalik_rapor_${institutionId || 'kurum'}.png`;
      link.href = dataUrl;
      link.click();

      // Open WhatsApp web with info message
      const msg = `Merhaba, *${institutionName || 'Kurum'}* Haftalık Öğrenci Raporu başarı tablosu görsel olarak oluşturuldu ve indirildi! Görseli ekleyerek gruplarda paylaşabilirsiniz.\n\n*Haftalık Rapor Özeti:*\n🔹 Toplam Rapor: ${stats.weeklyReportsCount || 0}\n🕌 Namaz Kayıtları: ${stats.weeklyNamazCount || 0}\n📚 Ders Raporları: ${stats.weeklyAkademikCount || 0}`;
      const waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error("WhatsApp share card generation failed:", err);
    }
  };

  // Get current date range string (e.g. 20 Temmuz - 27 Temmuz 2026)
  const getDateRangeString = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    
    const opt = { day: 'numeric', month: 'long' };
    const yearOpt = { year: 'numeric' };
    
    return `${start.toLocaleDateString('tr-TR', opt)} - ${end.toLocaleDateString('tr-TR', opt)} ${end.toLocaleDateString('tr-TR', yearOpt)}`;
  };

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  const topClass = stats?.topClasses?.[0];
  const totalReports = stats?.weeklyReportsCount || 0;
  const targetProgress = Math.min((totalReports / weeklyTarget) * 100, 100);

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans print:bg-white print:text-black">
      <Sidebar />


      {/* Main Content */}
      <main className="flex-1 pb-10 overflow-y-auto print:p-0">
        {/* Header - Styled for both screen & print */}
        <div className="bg-gradient-to-r from-[#eef5fc] via-[#e2eeff] to-[#d6e7ff] pt-8 pb-6 px-6 md:px-10 border-b border-blue-100/60 print:bg-white print:border-b print:pb-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/')} 
                className="p-2.5 bg-white rounded-xl text-slate-600 border border-slate-200 hover:bg-blue-50 shadow-sm print:hidden"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Haftalık Başarı Paneli</h1>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                  {getDateRangeString()} · {institutionName || 'Kurumsal Rapor'}
                </p>
              </div>
            </div>
            
            {/* Action Buttons - Hidden on print */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all shadow-sm"
              >
                <Printer size={16} /> PDF Raporu
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md border border-emerald-500/20"
              >
                <Share2 size={16} /> WhatsApp Kartı İndir
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 md:px-10 mt-6 space-y-6">
          {/* Top Banner Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Top Class */}
            <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl p-6 shadow-lg text-white flex items-center gap-5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <Trophy size={144} />
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-md">
                <Trophy size={32} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-100">🏆 HAFTANIN EN BAŞARILI SINIFI</div>
                <div className="text-3xl font-black mt-1">{topClass ? topClass.name : 'Bilinmiyor'}</div>
                <div className="text-xs text-amber-100 mt-1 font-medium">
                  {topClass ? `${topClass.score} Toplam Puan` : 'Henüz rapor girilmedi'}
                </div>
              </div>
            </div>

            {/* Namaz Raporları */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 shadow-lg text-white flex items-center gap-5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <Sunrise size={144} />
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-md">
                <Sunrise size={32} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100">🕌 NAMAZ RAPORLARI</div>
                <div className="text-3xl font-black mt-1">{stats?.weeklyNamazCount || 0}</div>
                <div className="text-xs text-emerald-100 mt-1 font-medium">Haftalık Namaz Kayıt Sayısı</div>
              </div>
            </div>

            {/* Akademik Raporlar */}
            <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-3xl p-6 shadow-lg text-white flex items-center gap-5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <BookOpen size={144} />
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-md">
                <BookOpen size={32} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-100">📚 DERS RAPORLARI</div>
                <div className="text-3xl font-black mt-1">{stats?.weeklyAkademikCount || 0}</div>
                <div className="text-xs text-violet-100 mt-1 font-medium">Haftalık Akademik Rapor Sayısı</div>
              </div>
            </div>

          </div>

          {/* Progress Goal & AI Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Weekly Goal Progress */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm md:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="text-blue-600" size={20} />
                    <h3 className="text-base font-extrabold text-slate-800">Haftalık Hedef Takibi</h3>
                  </div>
                  {!editingTarget ? (
                    <button 
                      onClick={() => setEditingTarget(true)} 
                      className="text-xs font-bold text-blue-600 hover:underline print:hidden"
                    >
                      Hedef Değiştir
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 print:hidden">
                      <input
                        type="number"
                        value={targetInput}
                        onChange={e => setTargetInput(e.target.value)}
                        className="w-16 px-2 py-1 text-xs border rounded-lg text-center"
                      />
                      <button onClick={handleSaveTarget} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle size={16} /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-5xl font-black text-slate-800">{totalReports}</span>
                      <span className="text-slate-400 text-sm font-bold"> / {weeklyTarget} Rapor</span>
                    </div>
                    <span className="text-sm font-extrabold text-blue-600">{Math.round(targetProgress)}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${targetProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500 font-medium">
                {targetProgress >= 100 
                  ? '🎉 Tebrikler! Haftalık rapor hedefinize ulaştınız.' 
                  : `Haftalık hedefinize ulaşmak için ${weeklyTarget - totalReports} rapor daha gerekiyor.`}
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white border border-blue-100/50 rounded-3xl p-6 shadow-sm md:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-blue-600 fill-blue-100" size={20} />
                    <h3 className="text-base font-extrabold text-slate-800">AI Haftalık Değerlendirme</h3>
                  </div>
                  <button
                    onClick={handleGenerateAISummary}
                    disabled={aiLoading}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all print:hidden"
                  >
                    {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiSummary ? 'Yeniden Üret' : 'Rapor Oluştur'}
                  </button>
                </div>

                <div className="text-slate-600 text-sm leading-relaxed min-h-[80px] bg-white/50 border border-white rounded-2xl p-4">
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <Loader2 size={24} className="text-blue-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-400">Gemini haftalık verileri analiz ediyor...</span>
                    </div>
                  ) : aiSummary ? (
                    <p className="font-medium italic">"{aiSummary}"</p>
                  ) : (
                    <p className="text-slate-400 text-center py-6 font-medium">
                      Haftalık verilerin yapay zeka tarafından değerlendirilmesi için yukarıdaki butona tıklayın.
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-bold tracking-widest mt-2 uppercase">
                ⚡ GOOGLE GEMINI DESTEKLİDİR
              </div>
            </div>

          </div>

          {/* Sınıf Sıralaması & Öğretmen Performansı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Class Leaderboard */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" /> Sınıf Başarı Sıralaması
              </h3>
              
              <div className="space-y-3">
                {stats?.topClasses?.map((cls, idx) => (
                  <div 
                    key={cls.name}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      idx === 0 
                        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-300/30' 
                        : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-black">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                      </span>
                      <span className="font-bold text-slate-700">{cls.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800">{cls.score} Puan</span>
                  </div>
                ))}

                {(!stats?.topClasses || stats.topClasses.length === 0) && (
                  <p className="text-sm text-slate-400 text-center py-8 font-medium">Henüz veri yok.</p>
                )}
              </div>
            </div>

            {/* Teacher Activity Leaderboard */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Flame size={18} className="text-orange-500" /> Öğretmen Performans Listesi
              </h3>

              <div className="space-y-3">
                {Object.entries(stats?.teacherPerformance || {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([teacher, count], idx) => (
                    <div 
                      key={teacher}
                      className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                          #{idx + 1}
                        </span>
                        <div className="text-sm font-bold text-slate-700">{teacher}</div>
                      </div>
                      <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 font-extrabold rounded-lg">
                        {count} Rapor
                      </span>
                    </div>
                  ))}

                {Object.keys(stats?.teacherPerformance || {}).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8 font-medium">Henüz veri yok.</p>
                )}
              </div>
            </div>

          </div>

          {/* Haftanın En İyi Öğrencileri */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" /> Haftanın En Yüksek Gelişim Gösteren Öğrencileri
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats?.topStudents?.map((st, i) => (
                <div 
                  key={st.id || i}
                  className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 w-12 h-12 bg-blue-500/5 rounded-bl-3xl flex items-center justify-center font-black text-blue-500">
                    #{i + 1}
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] font-bold tracking-wider uppercase mb-1">{st.class}</div>
                    <div className="text-slate-800 font-black text-lg">{st.name}</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100/50 flex justify-between items-baseline">
                    <span className="text-slate-400 text-xs font-bold">Kazanılan Puan</span>
                    <span className="text-lg font-black text-blue-600">{st.score} Puan</span>
                  </div>
                </div>
              ))}

              {(!stats?.topStudents || stats.topStudents.length === 0) && (
                <div className="col-span-3 text-sm text-slate-400 text-center py-8 font-medium">
                  Henüz veri yok.
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Hidden Card template used by html2canvas for WhatsApp card download */}
      {stats && (
        <WeeklyShareCard
          stats={stats}
          institutionName={institutionName}
          dateRange={getDateRangeString()}
          cardRef={cardRef}
        />
      )}
    </div>
  );
}
