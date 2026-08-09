'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import html2canvas from 'html2canvas';
import {
  Trophy, ArrowLeft, Loader2, Sparkles, Printer,
  CheckCircle, Target, Sunrise, BookOpen, Flame, MessageCircle, Award
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function WeeklySummaryPage() {
  const { user, role, institutionId, institutionName, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weeklyTarget, setWeeklyTarget] = useState(50);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('50');
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const cardRef = useRef(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchWeeklySummary = async () => {
    setLoading(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/students/weekly-summary?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setStats(data);
    } catch (e) {
      console.error('fetchWeeklySummary error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWeeklySummary();
      const savedTarget = localStorage.getItem(`weeklyTarget_${institutionId || 'yamanevler'}`);
      if (savedTarget) { setWeeklyTarget(parseInt(savedTarget, 10)); setTargetInput(savedTarget); }
    }
  }, [user, institutionId]);

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
    setAiLoading(true); setAiSummary('');
    try {
      const res = await fetch('/api/ai/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, institutionName }),
      });
      const data = await res.json();
      setAiSummary(data.success ? data.summary : 'AI raporu şu an oluşturulamadı.');
    } catch {
      setAiSummary('Bağlantı hatası.');
    } finally { setAiLoading(false); }
  };

  const handlePrint = () => window.print();

  const handleShareWhatsApp = async () => {
    if (!cardRef.current || !stats) return;
    setDownloadingCard(true);
    try {
      const cardEl = cardRef.current;
      const wrapper = cardEl.parentElement;
      const origStyle = wrapper.getAttribute('style') || '';
      wrapper.setAttribute('style', 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;opacity:1;');
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(cardEl, {
        useCORS: true, allowTaint: true, backgroundColor: null, scale: 2,
      });
      wrapper.setAttribute('style', origStyle);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `haftalik_rapor_${institutionId || 'kurum'}_${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataUrl; link.click();
      setTimeout(() => {
        const msg = `📊 *${institutionName || 'Kurum'}* — Haftalık Başarı Raporu\n\n🔹 Toplam Rapor: *${stats.weeklyReportsCount || 0}*\n🕌 Namaz Kayıtları: *${stats.weeklyNamazCount || 0}*\n📚 Akademik Raporlar: *${stats.weeklyAkademikCount || 0}*\n\nDetaylı tablo görseli ekte paylaşılmıştır. Hayırlı haftalar! 🌟`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
      }, 600);
    } catch (err) {
      console.error('WP card error:', err);
    } finally { setDownloadingCard(false); }
  };

  const getDateRangeString = () => {
    const end = new Date(); const start = new Date();
    start.setDate(end.getDate() - 7);
    return `${start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${end.toLocaleDateString('tr-TR', { year: 'numeric' })}`;
  };

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  const topClass = stats?.topClasses?.[0];
  const totalReports = stats?.weeklyReportsCount || 0;
  const targetProgress = Math.min((totalReports / weeklyTarget) * 100, 100);
  const instNameDisplay = institutionName || 'Kurumsal Rapor';
  const dateRangeStr = getDateRangeString();
  const pstyle = { fontFamily: "'Segoe UI', system-ui, sans-serif" };

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans">
      <style jsx global>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: white !important; margin: 0; }
          .screen-only { display: none !important; }
          .print-only { display: block !important; }
          @page { size: A4 portrait; margin: 0; }
        }
        @media screen { .print-only { display: none !important; } }
      `}</style>

      {/* ===== PRINT PAGE ===== */}
      <div className="print-only" style={{ position:'fixed', inset:0, background:'white', zIndex:9999, ...pstyle }}>
        <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e40af 55%,#0f172a 100%)', padding:'28px 44px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'18px' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:'rgba(255,255,255,0.12)', border:'2px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg viewBox="0 0 100 100" style={{ width:'30px', height:'30px', fill:'#93c5fd' }}>
                <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
              </svg>
            </div>
            <div>
              <div style={{ color:'#93c5fd', fontSize:'9px', fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:'3px' }}>ENDERUN RAPOR TAKİP SİSTEMİ</div>
              <div style={{ color:'white', fontSize:'24px', fontWeight:900 }}>{instNameDisplay}</div>
              <div style={{ color:'#bfdbfe', fontSize:'11px', fontWeight:500, marginTop:'2px' }}>Haftalık Başarı ve Gelişim Raporu</div>
            </div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'12px', padding:'12px 18px', textAlign:'right' }}>
            <div style={{ color:'#bfdbfe', fontSize:'9px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Rapor Dönemi</div>
            <div style={{ color:'white', fontSize:'12px', fontWeight:700, marginTop:'3px' }}>{dateRangeStr}</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', borderBottom:'2px solid #e2e8f0' }}>
          {[
            { label:'Toplam Rapor', value:stats?.weeklyReportsCount||0, color:'#1d4ed8', bg:'#eff6ff', icon:'📋', border:'#bfdbfe' },
            { label:'Namaz Kayıtları', value:stats?.weeklyNamazCount||0, color:'#065f46', bg:'#f0fdf4', icon:'🕌', border:'#bbf7d0' },
            { label:'Akademik Raporlar', value:stats?.weeklyAkademikCount||0, color:'#5b21b6', bg:'#faf5ff', icon:'📚', border:'#ddd6fe' },
            { label:'En Başarılı Sınıf', value:topClass?.name||'-', color:'#92400e', bg:'#fffbeb', icon:'🏆', border:'#fde68a' },
          ].map((item,i) => (
            <div key={i} style={{ background:item.bg, borderRight:i<3?`1px solid ${item.border}`:'', padding:'20px 24px' }}>
              <div style={{ fontSize:'18px', marginBottom:'5px' }}>{item.icon}</div>
              <div style={{ fontSize:'26px', fontWeight:900, color:item.color, lineHeight:1 }}>{item.value}</div>
              <div style={{ fontSize:'10px', color:'#64748b', fontWeight:600, marginTop:'5px', textTransform:'uppercase', letterSpacing:'0.06em' }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'22px', padding:'28px 44px' }}>
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'12px' }}>🏆 Sınıf Başarı Sıralaması</div>
            {(stats?.topClasses||[]).slice(0,5).map((cls,i) => (
              <div key={cls.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:'6px', background:i===0?'linear-gradient(135deg,#fef3c7,#fde68a)':'white', border:`1px solid ${i===0?'#f59e0b':'#e2e8f0'}`, borderRadius:'9px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'14px' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                  <span style={{ fontWeight:700, fontSize:'13px', color:'#1e293b' }}>{cls.name}</span>
                </div>
                <span style={{ fontWeight:800, fontSize:'13px', color:'#b45309' }}>{cls.score} Puan</span>
              </div>
            ))}
          </div>
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'12px' }}>⭐ Öğrenci Sıralaması</div>
            {(stats?.topStudents||[]).slice(0,5).map((st,i) => (
              <div key={st.id||i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:'6px', background:'white', border:'1px solid #e2e8f0', borderRadius:'9px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ width:'20px', height:'20px', borderRadius:'50%', background:'#eff6ff', color:'#2563eb', fontSize:'9px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>#${i+1}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'12px', color:'#1e293b' }}>{st.name}</div>
                    <div style={{ fontSize:'9px', color:'#94a3b8' }}>{st.class}</div>
                  </div>
                </div>
                <span style={{ fontWeight:800, fontSize:'12px', color:'#2563eb' }}>{st.score} Puan</span>
              </div>
            ))}
          </div>
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'20px', gridColumn:'span 2' }}>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'12px' }}>👨‍🏫 Öğretmen Performansı</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
              {Object.entries(stats?.teacherPerformance||{}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([t,c]) => (
                <div key={t} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'white', border:'1px solid #e2e8f0', borderRadius:'9px' }}>
                  <span style={{ fontSize:'11px', fontWeight:700, color:'#374151' }}>{t}</span>
                  <span style={{ fontSize:'11px', fontWeight:800, color:'#2563eb', background:'#eff6ff', padding:'1px 7px', borderRadius:'5px' }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
          {aiSummary && (
            <div style={{ background:'linear-gradient(135deg,#eff6ff,#f0fdf4)', border:'1px solid #bfdbfe', borderRadius:'14px', padding:'20px', gridColumn:'span 2' }}>
              <div style={{ fontSize:'10px', fontWeight:800, color:'#1e40af', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>🤖 Yapay Zeka Değerlendirmesi</div>
              <p style={{ fontSize:'12px', color:'#374151', lineHeight:1.8, fontStyle:'italic' }}>{aiSummary}</p>
            </div>
          )}
        </div>
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#0f172a', padding:'10px 44px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'#475569', fontSize:'9px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>© 2026 {instNameDisplay} · Enderun Rapor Takip Sistemi</span>
          <span style={{ color:'#475569', fontSize:'9px', fontWeight:600 }}>Oluşturma: {new Date().toLocaleString('tr-TR')}</span>
        </div>
      </div>

      {/* ===== SCREEN LAYOUT ===== */}
      <div className="screen-only"><Sidebar /></div>
      <main className="screen-only flex-1 pb-10 overflow-y-auto">
        <div className="bg-gradient-to-r from-[#eef5fc] via-[#e2eeff] to-[#d6e7ff] pt-8 pb-6 px-6 md:px-10 border-b border-blue-100/60">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/')} className="p-2.5 bg-white rounded-xl text-slate-600 border border-slate-200 hover:bg-blue-50 shadow-sm">
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">Haftalık Başarı Paneli</h1>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5">{dateRangeStr} · {instNameDisplay}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm">
                <Printer size={16} /> PDF Raporu
              </button>
              <button onClick={handleShareWhatsApp} disabled={downloadingCard} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">
                {downloadingCard ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                {downloadingCard ? 'Hazırlanıyor...' : 'WhatsApp Kartı İndir'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 md:px-10 mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 rounded-3xl p-6 shadow-lg text-white flex items-center gap-5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4"><Trophy size={144} /></div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20"><Trophy size={32} /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-100">🏆 EN BAŞARILI SINIF</div>
                <div className="text-3xl font-black mt-1">{topClass ? topClass.name : 'Bilinmiyor'}</div>
                <div className="text-xs text-amber-100 mt-1">{topClass ? `${topClass.score} Toplam Puan` : 'Henüz rapor girilmedi'}</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 shadow-lg text-white flex items-center gap-5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4"><Sunrise size={144} /></div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20"><Sunrise size={32} /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-100">🕌 NAMAZ RAPORLARI</div>
                <div className="text-3xl font-black mt-1">{stats?.weeklyNamazCount || 0}</div>
                <div className="text-xs text-emerald-100 mt-1">Haftalık Namaz Kayıt Sayısı</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-3xl p-6 shadow-lg text-white flex items-center gap-5 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4"><BookOpen size={144} /></div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20"><BookOpen size={32} /></div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-100">📚 DERS RAPORLARI</div>
                <div className="text-3xl font-black mt-1">{stats?.weeklyAkademikCount || 0}</div>
                <div className="text-xs text-violet-100 mt-1">Haftalık Akademik Rapor Sayısı</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm md:col-span-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="text-blue-600" size={20} />
                  <h3 className="text-base font-extrabold text-slate-800">Haftalık Hedef Takibi</h3>
                </div>
                {!editingTarget ? (
                  <button onClick={() => setEditingTarget(true)} className="text-xs font-bold text-blue-600 hover:underline">Hedef Değiştir</button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} className="w-20 text-sm border border-slate-300 rounded-lg px-2 py-1 font-bold text-center" />
                    <button onClick={handleSaveTarget} className="text-xs font-bold text-emerald-600 hover:underline">Kaydet</button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">{totalReports} / {weeklyTarget} Rapor</span>
                  <span className={targetProgress >= 100 ? 'text-emerald-600' : 'text-blue-600'}>{Math.round(targetProgress)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${targetProgress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`} style={{ width: `${targetProgress}%` }} />
                </div>
              </div>
              {targetProgress >= 100 && (
                <div className="mt-4 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-sm font-bold">
                  <CheckCircle size={16} /> Haftalık hedefe ulaşıldı! 🎉
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm md:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-violet-600" size={20} />
                  <h3 className="text-base font-extrabold text-slate-800">AI Değerlendirme Raporu</h3>
                </div>
                <button onClick={handleGenerateAISummary} disabled={aiLoading} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {aiLoading ? 'Oluşturuluyor...' : 'Rapor Oluştur'}
                </button>
              </div>
              <div className="flex-1 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 min-h-[80px]">
                {aiSummary ? (
                  <p className="text-slate-700 text-sm leading-relaxed">{aiSummary}</p>
                ) : (
                  <p className="text-slate-400 text-sm text-center pt-4">{aiLoading ? 'Yapay zeka analiz ediyor...' : 'Rapor Oluştur butonuna tıklayınız.'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2"><Award size={18} className="text-amber-500" /> Sınıf Başarı Sıralaması</h3>
              <div className="space-y-3">
                {stats?.topClasses?.map((cls, i) => (
                  <div key={cls.name} className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                      <span className="font-bold text-slate-700">{cls.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800">{cls.score} Puan</span>
                  </div>
                ))}
                {(!stats?.topClasses || stats.topClasses.length === 0) && <p className="text-sm text-slate-400 text-center py-8">Henüz veri yok.</p>}
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2"><Flame size={18} className="text-orange-500" /> Öğretmen Performans Listesi</h3>
              <div className="space-y-3">
                {Object.entries(stats?.teacherPerformance || {}).sort((a,b)=>b[1]-a[1]).map(([teacher, count], idx) => (
                  <div key={teacher} className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">#${idx+1}</span>
                      <div className="text-sm font-bold text-slate-700">{teacher}</div>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 font-extrabold rounded-lg">{count} Rapor</span>
                  </div>
                ))}
                {Object.keys(stats?.teacherPerformance || {}).length === 0 && <p className="text-sm text-slate-400 text-center py-8">Henüz veri yok.</p>}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2"><Sparkles size={18} className="text-blue-600" /> Haftanın En Yüksek Gelişim Gösteren Öğrencileri</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats?.topStudents?.map((st, i) => (
                <div key={st.id || i} className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-12 h-12 bg-blue-500/5 rounded-bl-3xl flex items-center justify-center font-black text-blue-500">#${i+1}</div>
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
                <div className="col-span-3 text-sm text-slate-400 text-center py-8">Henüz veri yok.</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ===== HIDDEN WP CARD ===== */}
      {stats && (
        <div style={{ position:'absolute', left:'-9999px', top:0, zIndex:-1 }}>
          <div ref={cardRef} style={{ width:'520px', background:'linear-gradient(145deg,#0a1628 0%,#0f2d6b 50%,#0a1628 100%)', color:'white', padding:'34px', borderRadius:'30px', fontFamily:'Segoe UI,system-ui,sans-serif', border:'2px solid rgba(99,179,237,0.2)' }}>
            <div style={{ textAlign:'center', marginBottom:'22px', paddingBottom:'18px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display:'inline-flex', width:'50px', height:'50px', borderRadius:'14px', background:'rgba(255,255,255,0.1)', border:'1.5px solid rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center', marginBottom:'10px' }}>
                <svg viewBox="0 0 100 100" style={{ width:'26px', height:'26px', fill:'#93c5fd' }}>
                  <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
                </svg>
              </div>
              <div style={{ fontSize:'18px', fontWeight:900, color:'white', marginBottom:'3px' }}>{instNameDisplay}</div>
              <div style={{ fontSize:'9px', fontWeight:700, color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:'7px' }}>HAFTALIK BAŞARI TABLOSU</div>
              <div style={{ display:'inline-block', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'18px', padding:'3px 12px', fontSize:'9px', color:'#bfdbfe' }}>{dateRangeStr}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'9px', marginBottom:'20px' }}>
              {[{l:'Toplam',v:stats.weeklyReportsCount||0,s:'Rapor',c:'#60a5fa'},{l:'Namaz',v:stats.weeklyNamazCount||0,s:'Kayıt',c:'#34d399'},{l:'Akademik',v:stats.weeklyAkademikCount||0,s:'Rapor',c:'#a78bfa'}].map((x,i)=>(
                <div key={i} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'13px', padding:'12px 9px', textAlign:'center' }}>
                  <div style={{ fontSize:'9px', fontWeight:800, color:x.c, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'5px' }}>{x.l}</div>
                  <div style={{ fontSize:'24px', fontWeight:900, color:x.c, lineHeight:1 }}>{x.v}</div>
                  <div style={{ fontSize:'8px', color:'rgba(255,255,255,0.3)', marginTop:'3px' }}>{x.s}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'9px', fontWeight:800, color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'8px' }}>🏆 Sınıf Başarı Sıralaması</div>
              {(stats.topClasses||[]).slice(0,3).map((cls,i)=>(
                <div key={cls.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:'5px', background:i===0?'rgba(251,191,36,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${i===0?'rgba(251,191,36,0.3)':'rgba(255,255,255,0.06)'}`, borderRadius:'11px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'14px' }}>{i===0?'🥇':i===1?'🥈':'🥉'}</span>
                    <span style={{ fontWeight:700, fontSize:'12px' }}>{cls.name}</span>
                  </div>
                  <span style={{ fontWeight:800, fontSize:'12px', color:'#fbbf24' }}>{cls.score} Puan</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'9px', fontWeight:800, color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'8px' }}>⭐ Öne Çıkan Öğrenciler</div>
              {(stats.topStudents||[]).slice(0,3).map((st,i)=>(
                <div key={st.id||i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:'5px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'11px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'10px', fontWeight:800, color:'#93c5fd' }}>#${i+1}</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'12px' }}>{st.name}</div>
                      <div style={{ fontSize:'9px', color:'rgba(147,197,253,0.6)' }}>{st.class}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight:800, fontSize:'12px', color:'#facc15' }}>{st.score} Puan</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'13px', textAlign:'center', fontSize:'8px', color:'rgba(147,197,253,0.4)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              © 2026 {instNameDisplay} · Enderun Rapor Takip Sistemi
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
