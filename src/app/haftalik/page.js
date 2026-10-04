'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, ArrowLeft, Loader2, Sparkles, Printer,
  CheckCircle, BookOpen, Flame, MessageCircle, Award,
  Users, Activity, Percent, Layers, BarChart2, TrendingUp,
  ChevronRight, X, Search, CheckSquare, ShieldCheck, Clock,
  GraduationCap, HeartPulse, CalendarCheck, DoorOpen, Copy,
  Check, Filter, FileText, ArrowUpRight, AlertCircle, Share2,
  AlertTriangle, UserCheck, HelpCircle, Building2
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie
} from 'recharts';
import Sidebar, { MobileHeader, MobileBottomNav } from '@/components/Sidebar';

const CATEGORY_CONFIG = {
  Akademik: {
    name: 'Akademik',
    title: 'Akademik Raporlar',
    desc: 'Ödev teslimi, sınav, test çözümü, ders başarısı ve kitap okuma verileri',
    icon: GraduationCap,
    gradient: 'from-blue-600 to-indigo-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
    chartColor: '#3b82f6',
  },
  Yoklama: {
    name: 'Yoklama',
    title: 'Yoklama ve İştirak Raporları',
    desc: 'Yemek, etüt, derse katılım ve genel kurum yoklaması verileri',
    icon: CheckSquare,
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    chartColor: '#10b981',
  },
  Program: {
    name: 'Program',
    title: 'Program ve Faaliyet Raporları',
    desc: 'Kurum içi manevi programlar, seminerler, sohbetler ve etkinlikler',
    icon: CalendarCheck,
    gradient: 'from-sky-500 to-cyan-600',
    lightBg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
    badge: 'bg-sky-100 text-sky-800',
    chartColor: '#0ea5e9',
  },
  Sağlık: {
    name: 'Sağlık',
    title: 'Sağlık ve Revir Raporları',
    desc: 'Hastalık takibi, revir, ilaç kullanımı ve doktor kontrolü kayıtları',
    icon: HeartPulse,
    gradient: 'from-rose-500 to-red-600',
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-800',
    chartColor: '#f43f5e',
  },
  'Girdi Çıktı': {
    name: 'Girdi Çıktı',
    title: 'Girdi - Çıktı ve Vakit Disiplini',
    desc: 'Kuruma giriş-çıkış, izinli ayrılma, geç gelme ve içeride/dışarıda durumu',
    icon: DoorOpen,
    gradient: 'from-teal-500 to-emerald-600',
    lightBg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    badge: 'bg-teal-100 text-teal-800',
    chartColor: '#14b8a6',
  },
  'Dahili Ders': {
    name: 'Dahili Ders',
    title: 'Dahili Ders ve Özel Etüt Raporları',
    desc: 'Kurum içi özel dersler, birebir etütler ve dahili ders iştirak oranları',
    icon: BookOpen,
    gradient: 'from-purple-600 to-violet-700',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
    chartColor: '#8b5cf6',
  },
};

export default function WeeklySummaryPage() {
  const { user, role, institutionId, institutionName, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);
  const cardRef = useRef(null);
  const [downloadingCard, setDownloadingCard] = useState(false);

  // ── Detail Modal States ─────────────────────────────────────────────────────
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalTab, setModalTab] = useState('classes'); // 'classes' | 'dahili' | 'groups'
  const [selectedGroupDetail, setSelectedGroupDetail] = useState(null);

  // ── Category Technical Modal ────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'positive' | 'negative'

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchWeeklySummary = async () => {
    setLoading(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/students/weekly-summary?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setStats(data);
        if (data.topGroups && data.topGroups.length > 0) {
          setSelectedGroupDetail(data.topGroups[0]);
        }
      }
    } catch (e) {
      console.error('fetchWeeklySummary error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWeeklySummary();
    }
  }, [user, institutionId]);

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
      setAiSummary(data.success ? data.summary : 'Kurumsal AI raporu şu an oluşturulamadı.');
    } catch {
      setAiSummary('Bağlantı hatası meydana geldi.');
    } finally { setAiLoading(false); }
  };

  const handleCopyAi = () => {
    if (!aiSummary) return;
    navigator.clipboard.writeText(aiSummary);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2500);
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
        const topGrpName = stats.topGroups?.[0]?.score > 0 ? ` (Lider Grup: ${stats.topGroups[0].name})` : '';
        const msg = `📊 *${institutionName || 'Kurum'}* — Haftalık Başarı & İştirak Raporu\n\n🔹 Toplam Rapor: *${stats.weeklyReportsCount || 0}*\n📋 Yoklama & İştirak: *${stats.weeklyYoklamaCount || stats.weeklyNamazCount || 0}*\n📚 Ders & Dahili Raporlar: *${(stats.weeklyAkademikCount || 0) + (stats.weeklyDahiliCount || 0)}*${topGrpName}\n\nDetaylı tablo görseli ekte paylaşılmıştır. Hayırlı haftalar! 🌟`;
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
  const topGroup = stats?.topGroups?.[0];
  const hasPositiveGroup = topGroup && topGroup.score > 0;
  const hasPositiveClass = topClass && topClass.score > 0;

  const totalReports = stats?.weeklyReportsCount || 0;
  const instNameDisplay = institutionName || 'Kurumsal Rapor';
  const dateRangeStr = getDateRangeString();
  const pstyle = { fontFamily: "'Segoe UI', system-ui, sans-serif" };

  // Chart data for modal
  const groupChartData = (stats?.topGroups || []).map(g => ({
    name: g.name,
    score: g.score,
    dahili: g.dahiliCount,
    efficiency: g.efficiencyRate
  }));

  const classChartData = (stats?.topClasses || []).map(c => ({
    name: c.name,
    score: c.score,
    dahili: c.dahiliCount,
    efficiency: c.efficiencyRate
  }));

  // Selected Category Data Calculation
  const catDetails = selectedCategory && stats?.categoryBreakdown ? stats.categoryBreakdown[selectedCategory] : null;
  const filteredCategoryReports = (catDetails?.reports || []).filter(r => {
    const matchSearch = !categorySearch.trim() ||
      r.studentName.toLowerCase().includes(categorySearch.toLowerCase()) ||
      (r.content && r.content.toLowerCase().includes(categorySearch.toLowerCase())) ||
      (r.className && r.className.toLowerCase().includes(categorySearch.toLowerCase()));
    
    if (!matchSearch) return false;
    if (categoryFilter === 'positive') return r.isPositive;
    if (categoryFilter === 'negative') return !r.isPositive;
    return true;
  });

  const categoryClassChartData = catDetails?.classDist ? Object.entries(catDetails.classDist).map(([name, count]) => ({
    name,
    count
  })) : [];

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans w-full max-w-full">
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
              <div style={{ color:'#bfdbfe', fontSize:'11px', fontWeight:500, marginTop:'2px' }}>Haftalık Başarı, İştirak ve Gelişim Raporu</div>
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
            { label:'Yoklama Kayıtları', value:stats?.weeklyYoklamaCount||stats?.weeklyNamazCount||0, color:'#065f46', bg:'#f0fdf4', icon:'📋', border:'#bbf7d0' },
            { label:'Ders & Dahili Rapor', value:(stats?.weeklyAkademikCount||0)+(stats?.weeklyDahiliCount||0), color:'#5b21b6', bg:'#faf5ff', icon:'📚', border:'#ddd6fe' },
            { label:'Lider Sınıf', value:hasPositiveClass ? topClass.name : (hasPositiveGroup ? topGroup.name : 'Pozitif Bekleniyor'), color:'#92400e', bg:'#fffbeb', icon:'🏆', border:'#fde68a' },
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
            <div style={{ fontSize:'10px', fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'12px' }}>🏫 Sınıflar Başarı Sıralaması</div>
            {(stats?.topClasses||[]).slice(0,5).map((cls,i) => (
              <div key={cls.name||i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:'6px', background:cls.score > 0 && i===0?'linear-gradient(135deg,#fef3c7,#fde68a)':'white', border:`1px solid ${cls.score > 0 && i===0?'#f59e0b':'#e2e8f0'}`, borderRadius:'9px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'14px' }}>{cls.score > 0 && i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                  <div>
                    <span style={{ fontWeight:700, fontSize:'13px', color:'#1e293b' }}>{cls.name} Sınıfı</span>
                    <span style={{ fontSize:'10px', color:'#64748b', marginLeft:'6px' }}>({cls.reportCount} Kayıt)</span>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontWeight:800, fontSize:'13px', color:cls.score > 0 ? '#b45309' : '#e11d48' }}>
                    {cls.score > 0 ? `+${cls.score}` : cls.score} Puan
                  </span>
                  <div style={{ fontSize:'9px', color:'#059669', fontWeight:700 }}>%{cls.efficiencyRate} Verim</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'20px' }}>
            <div style={{ fontSize:'10px', fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'12px' }}>⭐ En Başarılı Talebeler</div>
            {(stats?.topStudents||[]).slice(0,5).map((st,i) => (
              <div key={st.id||i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', marginBottom:'6px', background:'white', border:'1px solid #e2e8f0', borderRadius:'9px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ width:'20px', height:'20px', borderRadius:'50%', background:'#eff6ff', color:'#2563eb', fontSize:'9px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>#{i+1}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'12px', color:'#1e293b' }}>{st.name}</div>
                    <div style={{ fontSize:'9px', color:'#94a3b8' }}>{st.class}</div>
                  </div>
                </div>
                <span style={{ fontWeight:800, fontSize:'12px', color:'#16a34a' }}>+{st.score} Puan</span>
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
              <div style={{ fontSize:'10px', fontWeight:800, color:'#1e40af', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'8px' }}>🤖 Kurumsal Yönetici Değerlendirmesi</div>
              <div style={{ fontSize:'12px', color:'#374151', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{aiSummary}</div>
            </div>
          )}
        </div>
        <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#0f172a', padding:'10px 44px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:'#475569', fontSize:'9px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>© 2026 {instNameDisplay} · Enderun Rapor Takip Sistemi</span>
          <span style={{ color:'#475569', fontSize:'9px', fontWeight:600 }}>Oluşturma: {new Date().toLocaleString('tr-TR')}</span>
        </div>
      </div>

      {/* ===== SCREEN LAYOUT ===== */}
      <Sidebar />
      <MobileHeader title="Haftalık Özet" />
      <main className="flex-1 md:h-screen pb-28 md:pb-10 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="bg-gradient-to-r from-[#eef5fc] via-[#e2eeff] to-[#d6e7ff] pt-5 sm:pt-8 pb-4 sm:pb-6 px-3.5 sm:px-6 md:px-10 border-b border-blue-100/60">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={() => router.push('/')} className="p-2 sm:p-2.5 bg-white rounded-xl text-slate-600 border border-slate-200 hover:bg-blue-50 shadow-xs cursor-pointer shrink-0">
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 truncate">Haftalık Başarı Paneli</h1>
                <p className="text-slate-500 text-xs md:text-sm mt-0.5 truncate">{dateRangeStr} · {instNameDisplay}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button onClick={handlePrint} className="flex-1 md:flex-initial px-3.5 py-2 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 shadow-xs cursor-pointer">
                <Printer size={15} /> PDF Raporu
              </button>
              <button onClick={handleShareWhatsApp} disabled={downloadingCard} className="flex-1 md:flex-initial px-3.5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer">
                {downloadingCard ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                {downloadingCard ? 'Hazırlanıyor...' : 'WhatsApp Kartı İndir'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 md:px-10 mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          
          {/* ─── Top 3 Interactive Metric Cards ─── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
            {/* 1. EN BAŞARILI SINIF (CLICKABLE -> OPENS TECHNICAL MODAL) */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setModalTab('classes'); setShowDetailModal(true); }}
              className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl text-white flex flex-col justify-between relative overflow-hidden cursor-pointer border-2 border-amber-300/40 group"
              title="Dahili Ders İştirak, Verim ve Tüm İleri Düzey Verileri İncelemek İçin Tıklayın"
            >
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform pointer-events-none">
                <Trophy size={140} />
              </div>

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                    <Trophy size={26} className="text-amber-100 animate-bounce" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest text-amber-100 flex items-center gap-1">
                      🏆 EN BAŞARILI SINIF
                    </div>
                    <div className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight truncate">
                      {hasPositiveClass ? `${topClass.name} Sınıfı` : (hasPositiveGroup ? `${topGroup.name}` : 'Pozitif Faaliyet Bekleniyor')}
                    </div>
                    <div className="text-[11px] sm:text-xs text-amber-100 font-semibold truncate">
                      {hasPositiveClass ? `+${topClass.score} Puan · %${topClass.efficiencyRate} Verim` : (hasPositiveGroup ? `+${topGroup.score} Puan · %${topGroup.efficiencyRate} Verim` : 'Henüz pozitif faaliyet kaydedilmedi')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[10.5px] sm:text-[11px] font-extrabold text-amber-100 relative z-10">
                <span className="flex items-center gap-1.5 bg-black/20 px-2 sm:px-2.5 py-1 rounded-xl">
                  <Sparkles size={13} className="text-amber-300" /> Dahili İştirak & Verim Detayları
                </span>
                <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-white underline decoration-amber-300 font-black">
                  İncele <ChevronRight size={14} />
                </span>
              </div>
            </motion.div>

            {/* 2. YOKLAMA RAPORLARI (CLICKABLE -> OPENS TECHNICAL MODAL) */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory('Yoklama')}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg text-white flex flex-col justify-between relative overflow-hidden cursor-pointer border border-emerald-300/30 group"
              title="Yoklama Raporlarının Tüm Teknik Verilerini İncelemek İçin Tıklayın"
            >
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform pointer-events-none"><CheckSquare size={130} /></div>
              <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20"><CheckSquare size={26} /></div>
                <div className="min-w-0">
                  <div className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-100">📋 YOKLAMA RAPORLARI</div>
                  <div className="text-2xl sm:text-3xl font-black mt-0.5">{stats?.weeklyYoklamaCount || stats?.weeklyNamazCount || 0}</div>
                  <div className="text-[11px] sm:text-xs text-emerald-100 truncate">Haftalık Yoklama & Katılım</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[10.5px] sm:text-[11px] font-extrabold text-emerald-100 relative z-10">
                <span>Teknik Verileri İncele</span>
                <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-white font-black underline">Detaylar <ChevronRight size={14} /></span>
              </div>
            </motion.div>

            {/* 3. DERS & DAHİLİ RAPORLARI (CLICKABLE -> OPENS TECHNICAL MODAL) */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory('Dahili Ders')}
              className="bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg text-white flex flex-col justify-between relative overflow-hidden cursor-pointer border border-violet-300/30 group"
              title="Ders ve Dahili Raporların Tüm Teknik Verilerini İncelemek İçin Tıklayın"
            >
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform pointer-events-none"><BookOpen size={130} /></div>
              <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/20"><BookOpen size={26} /></div>
                <div className="min-w-0">
                  <div className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest text-violet-100">📚 DERS VE DAHİLİ RAPORLAR</div>
                  <div className="text-2xl sm:text-3xl font-black mt-0.5">{(stats?.weeklyAkademikCount || 0) + (stats?.weeklyDahiliCount || 0)}</div>
                  <div className="text-[11px] sm:text-xs text-violet-100 truncate">
                    Akademik: {stats?.weeklyAkademikCount || 0} · Dahili: {stats?.weeklyDahiliCount || 0}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[10.5px] sm:text-[11px] font-extrabold text-violet-100 relative z-10">
                <span>Teknik Verileri İncele</span>
                <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-white font-black underline">Detaylar <ChevronRight size={14} /></span>
              </div>
            </motion.div>
          </div>

          {/* ─── 6 ANA KATEGORİ DAĞILIMI & TEKNİK İNCELEME KUTULARI (2. Görsel Stili) ─── */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={18} className="text-blue-600" /> Kategori Dağılımı ve Teknik İnceleme
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Tüm yurt genelinde teknik döküm, sınıf dağılımı ve detayları görmek için bir kategoriye dokunun.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {stats?.insideCount !== undefined ? `${stats.insideCount} Talebe İçeride` : 'Kurumda'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {['Akademik', 'Yoklama', 'Program', 'Sağlık', 'Girdi Çıktı', 'Dahili Ders'].map((catKey) => {
                const conf = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG['Akademik'];
                const IconComponent = conf.icon;
                const count = stats?.categoryCounts?.[catKey] || 0;
                const catData = stats?.categoryBreakdown?.[catKey];

                return (
                  <motion.div
                    key={catKey}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedCategory(catKey)}
                    className={`bg-white border-2 hover:${conf.border} hover:shadow-md rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden group shadow-xs`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-slate-900 transition-colors">
                        {catKey.toUpperCase()}
                      </span>
                      <div className={`p-1.5 rounded-xl ${conf.lightBg} ${conf.text} group-hover:scale-110 transition-transform`}>
                        <IconComponent size={14} />
                      </div>
                    </div>

                    <div className="my-2">
                      <div className={`text-2xl md:text-3xl font-black ${conf.text}`}>
                        {count}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {catKey === 'Girdi Çıktı' 
                          ? `${stats?.insideCount || 0} İçeride` 
                          : catData ? `%${catData.efficiencyRate} Verim` : 'Haftalık Kayıt'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                      <span>Teknik İncele</span>
                      <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ─── KURUMSAL YÖNETİCİ AI DEĞERLENDİRME RAPORU (GENİŞLETİLMİŞ & HEDEFSİZ) ─── */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-200">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-slate-900">Kurumsal Yönetici AI Değerlendirme Raporu</h3>
                  <p className="text-xs text-slate-400 font-medium">Yurt genelindeki güncel yoklama, dahili ders ve disiplin verilerine dayalı resmî bilgilendirme</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {aiSummary && (
                  <button
                    onClick={handleCopyAi}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Rapor Metnini Kopyala"
                  >
                    {copiedAi ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedAi ? 'Kopyalandı' : 'Metni Kopyala'}
                  </button>
                )}
                <button
                  onClick={handleGenerateAISummary}
                  disabled={aiLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-violet-200 transition-all hover:scale-[1.02]"
                >
                  {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {aiLoading ? 'Rapor Kaleme Alınıyor...' : 'Yönetici Raporu Oluştur'}
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50/80 via-blue-50/30 to-violet-50/20 rounded-2xl p-5 border border-slate-100 min-h-[110px] relative">
              {aiSummary ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-violet-800 uppercase tracking-wider pb-2 border-b border-violet-100/80">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-violet-600" /> Resmî İdare ve Talebe Gelişim Raporu
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold lowercase">
                      {new Date().toLocaleDateString('tr-TR')} · {instNameDisplay}
                    </span>
                  </div>
                  <div className="text-slate-700 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {aiSummary}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Sparkles className="text-violet-300 mb-2" size={32} />
                  <p className="text-slate-600 font-extrabold text-xs">
                    {aiLoading ? 'Yapay zekâ kurumun tüm teknik verilerini derleyerek yönetici raporunu kaleme alıyor...' : 'Yönetici Raporu Oluştur butonuna basarak kurumun güncel durumuna dair resmî brifing alabilirsiniz.'}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Rapor, kurum yöneticisi üslubuyla tüm kategorileri ve lider grupları değerlendirir.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sınıf & Öğretmen Sıralamaları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sınıflar Başarı Sıralaması */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Building2 size={18} className="text-indigo-600" /> Sınıflar Başarı Sıralaması
                </h3>
                <button
                  type="button"
                  onClick={() => { setModalTab('classes'); setShowDetailModal(true); }}
                  className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Teknik Detaylar ↗
                </button>
              </div>
              <div className="space-y-3">
                {(stats?.topClasses || []).map((cls, i) => (
                  <div
                    key={cls.name || i}
                    onClick={() => { setModalTab('classes'); setShowDetailModal(true); }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${
                      cls.score > 0 && i === 0 ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-xs' : 'bg-slate-50/50 border-slate-100 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cls.score > 0 && i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                      <div>
                        <span className="font-extrabold text-slate-800">{cls.name} Sınıfı</span>
                        <div className="text-[10px] text-slate-400 font-semibold">{cls.reportCount} Faaliyet Kaydı · %{cls.dahiliParticipationRate || 0} Dahili İştirak</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-black ${cls.score > 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                        {cls.score > 0 ? `+${cls.score}` : cls.score} Puan
                      </span>
                      <div className="text-[10px] font-bold text-emerald-600">%{cls.efficiencyRate} Verim</div>
                    </div>
                  </div>
                ))}
                {(!stats?.topClasses || stats.topClasses.length === 0) && (
                  <div className="text-sm text-slate-400 text-center py-8">
                    Bu hafta henüz sınıf faaliyeti kaydedilmedi.
                  </div>
                )}
              </div>
            </div>

            {/* Öğretmen Performans Listesi */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Flame size={18} className="text-orange-500" /> Öğretmen Performans Listesi
              </h3>
              <div className="space-y-3">
                {Object.entries(stats?.teacherPerformance || {}).sort((a,b)=>b[1]-a[1]).map(([teacher, count], i) => (
                  <div key={teacher} className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-slate-400">#{i+1}</span>
                      <span className="font-bold text-slate-700 text-xs">{teacher}</span>
                    </div>
                    <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">{count} Rapor</span>
                  </div>
                ))}
                {Object.keys(stats?.teacherPerformance || {}).length === 0 && <p className="text-sm text-slate-400 text-center py-8">Henüz veri yok.</p>}
              </div>
            </div>
          </div>

          {/* ─── 2 AYRI TALEBE BÖLÜMÜ: 1. POZİTİF GELİŞİM, 2. İLGİ & DESTEK BEKLEYENLER ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. POZİTİF BAŞARILAR (Score > 0) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-500" /> Haftanın En Yüksek Gelişim Gösteren Talebeleri
                </h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                  {stats?.topStudents?.length || 0} Talebe
                </span>
              </div>

              <div className="space-y-2.5">
                {(stats?.topStudents || []).map((st, i) => (
                  <div key={st.id || i} className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-white hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        #{i+1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{st.name}</h4>
                        <p className="text-[10px] text-slate-400">{st.class} · {st.positiveCount} Olumlu Davranış</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                      +{st.score} Puan
                    </span>
                  </div>
                ))}

                {(!stats?.topStudents || stats.topStudents.length === 0) && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4">
                    <UserCheck className="mx-auto text-slate-300 mb-1" size={24} />
                    <p className="text-xs font-bold text-slate-600">Bu hafta henüz pozitif puanlı gelişim kaydı girilmedi.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Talebelere olumlu rapor girildikçe burada listelenecektir.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. İLGİ & REHBERLİK BEKLEYENLER (Eksi Puanlı / Olumsuz Bildirimli) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-500" /> Takip ve Rehberlik Gereken Talebeler
                </h3>
                <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                  {stats?.studentsNeedingSupport?.length || 0} Kayıt
                </span>
              </div>

              <div className="space-y-2.5">
                {(stats?.studentsNeedingSupport || []).map((st, i) => (
                  <div key={st.id || i} className="p-3 bg-rose-50/40 border border-rose-100 rounded-2xl flex items-center justify-between hover:bg-rose-50/70 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        !
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{st.name}</h4>
                        <p className="text-[10px] text-slate-500">
                          {st.class} · {st.negativeCount} Olumsuz / Gecikme Kaydı
                        </p>
                        {st.lastNegativeNote && (
                          <p className="text-[9px] text-rose-600 italic mt-0.5 line-clamp-1">
                            &ldquo;{st.lastNegativeNote}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-700 bg-rose-100/80 border border-rose-200 px-2.5 py-1 rounded-xl">
                      {st.score} Puan
                    </span>
                  </div>
                ))}

                {(!stats?.studentsNeedingSupport || stats.studentsNeedingSupport.length === 0) && (
                  <div className="text-center py-8 bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200 p-4">
                    <CheckCircle className="mx-auto text-emerald-400 mb-1" size={24} />
                    <p className="text-xs font-bold text-emerald-800">Harika! Bu hafta olumsuz veya eksi puan alan talebe bulunmuyor. 🎉</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">Tüm talebelerimiz disiplin ve katılım kurallarına riayet etmektedir.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════════
          KATEGORİ TEKNİK VERİLERİ VE DETAY MODALI (CATEGORY DEEP DIVE MODAL)
         ═══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              {(() => {
                const conf = CATEGORY_CONFIG[selectedCategory] || CATEGORY_CONFIG['Akademik'];
                const IconComponent = conf.icon;
                return (
                  <div className={`p-6 bg-gradient-to-r ${conf.gradient} text-white flex items-center justify-between border-b border-white/10`}>
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 bg-white/20 border border-white/30 rounded-2xl flex items-center justify-center text-white shadow-inner">
                        <IconComponent size={26} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base md:text-lg font-black tracking-tight">{conf.title}</h2>
                          <span className="text-[10px] bg-white/20 text-white font-extrabold px-2 py-0.5 rounded-full border border-white/30">
                            {catDetails?.count || 0} Toplam Kayıt
                          </span>
                        </div>
                        <p className="text-xs text-white/80 mt-0.5">{conf.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-2xl transition-all cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>
                );
              })()}

              {/* Technical Metrics Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Toplam Rapor</span>
                  <span className="text-lg font-black text-slate-800">{catDetails?.count || 0}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Olumlu İştirak (+)</span>
                  <span className="text-lg font-black text-emerald-700">+{catDetails?.positiveCount || 0}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-rose-500 uppercase block">Eksik / Olumsuz (-)</span>
                  <span className="text-lg font-black text-rose-700">-{catDetails?.negativeCount || 0}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase block">Verimlilik Oranı</span>
                  <span className="text-lg font-black text-blue-900">%{catDetails?.efficiencyRate || 100}</span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Sınıf Dağılım Grafiği */}
                {categoryClassChartData.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>📊 SINIF BAZINDA {selectedCategory.toUpperCase()} DAĞILIMI</span>
                      <span className="text-slate-600 font-bold">{categoryClassChartData.length} Sınıf</span>
                    </div>
                    <div className="h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryClassChartData}>
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={25} />
                          <Tooltip />
                          <Bar 
                            dataKey="count" 
                            name="Rapor Sayısı" 
                            fill={CATEGORY_CONFIG[selectedCategory]?.chartColor || '#3b82f6'} 
                            radius={[6, 6, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder={`${selectedCategory} kayıtlarında talebe adı, sınıf veya içerik ara...`}
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('all')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        categoryFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tümü ({catDetails?.count || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('positive')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        categoryFilter === 'positive' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      Olumlu (+{catDetails?.positiveCount || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('negative')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        categoryFilter === 'negative' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      Olumsuz (-{catDetails?.negativeCount || 0})
                    </button>
                  </div>
                </div>

                {/* Technical Reports Table */}
                <div className="space-y-2.5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    📋 {selectedCategory.toUpperCase()} RAPOR LİSTESİ ({filteredCategoryReports.length} Kayıt)
                  </div>

                  {filteredCategoryReports.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCategoryReports.map((r, idx) => (
                        <div
                          key={r.id || idx}
                          className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all shadow-2xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                              r.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {r.isPositive ? '+' : '-'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-800 text-xs">{r.studentName}</span>
                                {r.className && (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                    {r.className}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {r.createdAt ? new Date(r.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium mt-1">
                                {r.content}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Kaydeden: <strong className="text-slate-600">{r.createdBy || 'Öğretmen'}</strong>
                            </span>
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              r.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {r.points > 0 ? `+${r.points}` : r.points} Puan
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                      <p className="text-xs font-bold text-slate-600">Bu kategoride gösterilecek rapor bulunamadı.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Arama filtrenizi temizleyebilir veya yeni rapor ekleyebilirsiniz.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Toplam {filteredCategoryReports.length} teknik kayıt listeleniyor.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════════
          İLERİ DÜZEY DETAY & İŞTİRAK ANALİZ MODALI (DEEP ANALYTICS MODAL)
         ═══════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDetailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/20 border border-amber-400/30 rounded-2xl flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                    <Trophy size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight truncate">İleri Düzey İştirak &amp; Performans</h2>
                      <span className="text-[9px] sm:text-[10px] bg-amber-400/20 text-amber-300 font-extrabold px-2 py-0.5 rounded-full border border-amber-400/30 shrink-0">
                        Canlı Rapor
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-blue-200/70 mt-0.5 truncate">Dahili ders iştiraki, verim endeksi ve tüm teknik dökümler</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 sm:p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="px-3 sm:px-6 pt-2.5 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setModalTab('classes')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    modalTab === 'classes'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Award size={14} /> Sınıflar & İştirak ({stats?.topClasses?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('dahili')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    modalTab === 'dahili'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <BookOpen size={14} /> Dahili Ders İştirak Karnesi
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('groups')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    modalTab === 'groups'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Users size={14} /> Öğretmen Grupları Detayı ({stats?.topGroups?.length || 0})
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* ─── TAB 1: ÖĞRETMEN GRUPLARI (ASLANLAR VB.) ─── */}
                {modalTab === 'groups' && (
                  <div className="space-y-6">
                    {/* Visual Comparison Chart */}
                    {groupChartData.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          📊 GRUPLARIN PUAN VE DAHİLİ DERS KARŞILAŞTIRMASI
                        </div>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={groupChartData}>
                              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={25} />
                              <Tooltip />
                              <Bar dataKey="score" name="Toplam Puan" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="dahili" name="Dahili Ders Kaydı" fill="#a855f7" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Groups Detailed Cards */}
                    <div className="space-y-4">
                      {(stats?.topGroups || []).map((grp, i) => (
                        <div
                          key={grp.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 hover:border-blue-300 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center font-black text-sm shadow-sm ${
                                grp.score > 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-slate-600'
                              }`}>
                                {grp.score > 0 && i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                              </div>
                              <div>
                                <h3 className="text-base font-black text-slate-900">{grp.name}</h3>
                                <p className="text-xs text-slate-400 font-semibold">
                                  Sorumlu: <span className="text-slate-700 font-bold">{grp.teacherName}</span> · {grp.studentCount} Talebe
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-blue-600 uppercase block">Toplam Puan</span>
                                <span className={`text-sm font-black ${grp.score > 0 ? 'text-blue-900' : 'text-rose-700'}`}>
                                  {grp.score > 0 ? `+${grp.score}` : grp.score}
                                </span>
                              </div>
                              <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-purple-600 uppercase block">Dahili İştirak</span>
                                <span className="text-sm font-black text-purple-900">{grp.dahiliCount} Kayıt</span>
                              </div>
                              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                                <span className="text-[9px] font-bold text-emerald-600 uppercase block">Verim Oranı</span>
                                <span className="text-sm font-black text-emerald-900">%{grp.efficiencyRate}</span>
                              </div>
                            </div>
                          </div>

                          {/* Member Students Grid in Group */}
                          <div className="space-y-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                              <span>Grup Üyeleri ve Bireysel Performansları</span>
                              <span className="text-emerald-600 font-bold">+{grp.positiveCount} Olumlu / -{grp.negativeCount} Olumsuz</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {(grp.members || []).map((m, mIdx) => (
                                <div
                                  key={m.id || mIdx}
                                  className="p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-extrabold text-slate-800">{m.name}</div>
                                    <div className="text-[10px] text-slate-400">{m.class} · {m.dahiliCount} Dahili</div>
                                  </div>
                                  <span className={`font-black text-xs px-2 py-0.5 rounded-lg border ${
                                    m.score > 0 
                                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                                      : m.score < 0 
                                        ? 'text-rose-700 bg-rose-50 border-rose-200' 
                                        : 'text-slate-700 bg-white border-slate-200'
                                  }`}>
                                    {m.score > 0 ? `+${m.score}` : m.score} P
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!stats?.topGroups || stats.topGroups.length === 0) && (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                          <p className="text-xs font-bold text-slate-600">Henüz tanımlanmış öğretmen grubu bulunmuyor.</p>
                          <p className="text-[11px] text-slate-400 mt-1">Ayarlar sayfasından kendi talebe grubunuzu tanımlayabilirsiniz.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: SINIF PERFORMANSLARI ─── */}
                {modalTab === 'classes' && (
                  <div className="space-y-6">
                    {/* Class Chart */}
                    {classChartData.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          📊 SINIFLARIN PUAN VE DAHİLİ İŞTİRAK KARŞILAŞTIRMASI
                        </div>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={classChartData}>
                              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={25} />
                              <Tooltip />
                              <Bar dataKey="score" name="Toplam Puan" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="dahili" name="Dahili Ders Kaydı" fill="#a855f7" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(stats?.topClasses || []).map((cls, i) => (
                        <div
                          key={cls.name}
                          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{cls.score > 0 && i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                              <div>
                                <h3 className="text-sm font-black text-slate-900">{cls.name} Sınıfı</h3>
                                <p className="text-[10px] text-slate-400 font-semibold">{cls.reportCount} Toplam Rapor</p>
                              </div>
                            </div>
                            <span className={`text-sm font-black px-3 py-1 rounded-xl border ${
                              cls.score > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'
                            }`}>
                              {cls.score > 0 ? `+${cls.score}` : cls.score} Puan
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Verimlilik</span>
                              <span className="font-extrabold text-emerald-600">%{cls.efficiencyRate}</span>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-slate-400 block text-[9px] uppercase font-bold">Dahili İştirak</span>
                              <span className="font-extrabold text-purple-600">{cls.dahiliCount} Ders</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: DAHİLİ DERS KARNESİ ─── */}
                {modalTab === 'dahili' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center gap-3">
                      <BookOpen size={24} className="text-purple-700 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider">Dahili Ders &amp; Özel Etüt Takip Sistemi</h4>
                        <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                          Kurum içi verilen özel dersler, belletici etütleri ve talebelerin bireysel katılım oranları.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {(stats?.topStudents || []).map((st) => (
                        <div key={st.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{st.name}</div>
                            <div className="text-[10px] text-slate-400">{st.class}</div>
                          </div>
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-black">
                            {st.dahiliCount || 0} Ders
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Tüm veriler kurum veritabanından anlık olarak derlenmektedir.
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Card for html2canvas export */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <div ref={cardRef} className="w-[600px] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-8 rounded-3xl text-white shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <div className="text-[10px] font-black tracking-widest uppercase text-blue-300">HAFTALIK GELİŞİM VE BAŞARI KARNESİ</div>
              <div className="text-2xl font-black mt-1 text-white">{instNameDisplay}</div>
              <div className="text-xs text-blue-200 mt-0.5">{dateRangeStr}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Trophy size={26} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <span className="text-[9px] uppercase font-bold text-blue-200 block">Toplam Rapor</span>
              <span className="text-xl font-black text-white">{stats?.weeklyReportsCount || 0}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <span className="text-[9px] uppercase font-bold text-emerald-300 block">Yoklama & İştirak</span>
              <span className="text-xl font-black text-emerald-300">{stats?.weeklyYoklamaCount || stats?.weeklyNamazCount || 0}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
              <span className="text-[9px] uppercase font-bold text-purple-300 block">Ders & Dahili</span>
              <span className="text-xl font-black text-purple-300">{(stats?.weeklyAkademikCount || 0) + (stats?.weeklyDahiliCount || 0)}</span>
            </div>
          </div>

          {topGroup && topGroup.score > 0 && (
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">🏆 HAFTANIN LİDER GRUBU</span>
                <span className="text-lg font-black text-white">{topGroup.name}</span>
                <span className="text-xs text-amber-200/80 block mt-0.5">{topGroup.teacherName} · {topGroup.studentCount} Talebe</span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-amber-300">+{topGroup.score} Puan</span>
                <span className="text-xs text-emerald-400 font-bold block">%{topGroup.efficiencyRate} Verim</span>
              </div>
            </div>
          )}

          <div className="text-[10px] text-blue-200/60 text-center pt-2 border-t border-white/10">
            Enderun Rapor Takip Sistemi · {new Date().toLocaleDateString('tr-TR')}
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
