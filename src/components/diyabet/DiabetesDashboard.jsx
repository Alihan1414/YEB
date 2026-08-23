'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Syringe, Utensils, Plus, ShieldAlert,
  TrendingUp, Award, Clock, Sparkles, HeartPulse,
  Share2, Download, Settings, ChevronRight, CheckCircle2, AlertCircle
} from 'lucide-react';
import GlucoseInsulinForm from './GlucoseInsulinForm';
import GlucoseChart from './GlucoseChart';
import LogTimeline from './LogTimeline';
import HypoGuideModal from './HypoGuideModal';
import AiAssistantModal from './AiAssistantModal';
import DiabetesSettingsModal from './DiabetesSettingsModal';

const INITIAL_DEMO_RECORDS = [
  {
    id: 'demo-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(), // 14 hours ago
    glucose: 110,
    insulinUnits: 14,
    insulinType: 'bazal',
    insulinSite: 'Göbek (Karın)',
    carbs: 0,
    tag: 'gece',
    notes: 'Gece bazal insülini yapıldı (Lantus)',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
  },
  {
    id: 'demo-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago (Morning)
    glucose: 92,
    insulinUnits: 5,
    insulinType: 'bolus',
    insulinSite: 'Göbek (Karın)',
    carbs: 45,
    mealType: 'Kahvaltı',
    tag: 'aclik',
    notes: 'Yumurta, peynir, 2 dilim tam buğday ekmeği',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'demo-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago (Post Breakfast)
    glucose: 138,
    insulinUnits: 0,
    carbs: 0,
    tag: 'tokluk',
    notes: 'Kahvaltı sonrası 2. saat ölçümü. İdeal seyrediyor.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'demo-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
    glucose: 165,
    insulinUnits: 6,
    insulinType: 'bolus',
    insulinSite: 'Sağ Kol',
    carbs: 60,
    mealType: 'Öğle Yemeği',
    tag: 'tokluk',
    notes: 'Tavuk pilav ve salata',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
];

export default function DiabetesDashboard() {
  const [records, setRecords] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHypoModalOpen, setIsHypoModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hypoValue, setHypoValue] = useState(null);

  // Load & Sync records on mount
  useEffect(() => {
    const fetchSyncRecords = async () => {
      try {
        const res = await fetch('/api/diyabet/sync');
        const data = await res.json();
        if (data.success && data.records && data.records.length > 0) {
          setRecords(data.records);
          localStorage.setItem('td1_diyabet_records', JSON.stringify(data.records));
          return;
        }
      } catch (e) {
        console.error('API Sync error, fallback to localStorage:', e);
      }

      try {
        const saved = localStorage.getItem('td1_diyabet_records');
        if (saved) {
          setRecords(JSON.parse(saved));
        } else {
          setRecords(INITIAL_DEMO_RECORDS);
          localStorage.setItem('td1_diyabet_records', JSON.stringify(INITIAL_DEMO_RECORDS));
        }
      } catch (e) {
        setRecords(INITIAL_DEMO_RECORDS);
      }
    };

    fetchSyncRecords();
  }, []);

  // Save to storage & sync with server API
  const saveRecordsToStorage = async (newRecords, addedRecord = null, deletedId = null) => {
    setRecords(newRecords);
    try {
      localStorage.setItem('td1_diyabet_records', JSON.stringify(newRecords));
    } catch (e) {
      console.error('Save error:', e);
    }

    try {
      if (addedRecord) {
        await fetch('/api/diyabet/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record: addedRecord }),
        });
      } else if (deletedId) {
        await fetch('/api/diyabet/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: deletedId }),
        });
      }
    } catch (e) {
      console.error('Server sync error:', e);
    }
  };

  const handleAddRecord = (newRecord) => {
    const updated = [newRecord, ...records];
    saveRecordsToStorage(updated, newRecord);

    // Check if blood glucose is hypo < 70
    if (newRecord.glucose && newRecord.glucose < 70) {
      setHypoValue(newRecord.glucose);
      setIsHypoModalOpen(true);
    }
  };

  const handleDeleteRecord = (id) => {
    const updated = records.filter(r => r.id !== id);
    saveRecordsToStorage(updated, null, id);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const validGlucose = records.filter(r => r.glucose !== null && r.glucose !== undefined);
    if (validGlucose.length === 0) {
      return {
        avgGlucose: 0,
        estHbA1c: 0,
        tirPercent: 0,
        hypoCount: 0,
        hyperCount: 0,
        totalInsulin: 0,
        totalCarbs: 0,
        latestGlucose: null,
      };
    }

    const sumG = validGlucose.reduce((acc, curr) => acc + Number(curr.glucose), 0);
    const avgGlucose = Math.round(sumG / validGlucose.length);

    // Estimated HbA1c formula: (eAG + 46.7) / 28.7
    const estHbA1c = ((avgGlucose + 46.7) / 28.7).toFixed(1);

    // TIR (Time in Range: 70 - 180 mg/dL)
    const targetCount = validGlucose.filter(r => r.glucose >= 70 && r.glucose <= 180).length;
    const hypoCount = validGlucose.filter(r => r.glucose < 70).length;
    const hyperCount = validGlucose.filter(r => r.glucose > 180).length;
    const tirPercent = Math.round((targetCount / validGlucose.length) * 100);

    // Insulin & Carbs sums
    const totalInsulin = records.reduce((acc, r) => acc + (Number(r.insulinUnits) || 0), 0);
    const totalCarbs = records.reduce((acc, r) => acc + (Number(r.carbs) || 0), 0);

    // Latest Glucose
    const sorted = [...validGlucose].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const latestGlucose = sorted[0] ? sorted[0].glucose : null;

    return {
      avgGlucose,
      estHbA1c,
      tirPercent,
      hypoCount,
      hyperCount,
      totalInsulin,
      totalCarbs,
      latestGlucose,
    };
  }, [records]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-slate-900/95 to-teal-950/60 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-4 relative z-10">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl p-0.5 bg-gradient-to-tr from-teal-500 via-cyan-400 to-indigo-500 shadow-xl shadow-teal-500/20 shrink-0">
            <img
              src="/dia_ai_avatar.png"
              alt="DiaAI Medical Assistant"
              className="w-full h-full object-cover rounded-[22px]"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider shadow-md">
                TD1 Asistanı
              </span>
              <span className="text-xs text-teal-400 font-bold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tip 1 Diyabetim Yanımda</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center space-x-3">
              <span>Diyabet Takip & Yönetim Paneli</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Kan şekeri ölçümlerinizi, bolus/bazal insülin dozlarınızı ve karbonhidrat alımlarınızı yapay zeka desteğiyle yönetin.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-lg"
            title="Kişisel ICR / ISF Ayarlarını Düzenle"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Ayarlar</span>
          </button>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-teal-500/20 to-indigo-500/20 hover:from-teal-500/30 hover:to-indigo-500/30 text-teal-300 border border-teal-500/40 font-bold text-xs flex items-center space-x-2 transition-all shadow-lg backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>DiaAI Asistan</span>
          </button>

          <button
            onClick={() => setIsHypoModalOpen(true)}
            className="px-4 py-3 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-xs flex items-center space-x-2 transition-all shadow-lg"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>15-15 Hipo Rehberi</span>
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-slate-950 font-black text-sm flex items-center space-x-2 shadow-xl shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5 text-slate-950 stroke-[3]" />
            <span>Yeni Kayıt Ekle</span>
          </button>
        </div>
      </div>

      {/* LATEST HYPO ALERT BANNER IF APPLICABLE */}
      {metrics.latestGlucose && metrics.latestGlucose < 70 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-rose-950 via-rose-900 to-amber-950 p-4 rounded-2xl border-2 border-rose-600/70 shadow-xl flex items-center justify-between gap-4 text-white"
        >
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-600 rounded-xl text-white font-black animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-rose-200">DİKKAT: Son Kan Şekeriniz Düşük ({metrics.latestGlucose} mg/dL)!</h4>
              <p className="text-xs text-rose-100/90">Hızlı etkili 15g karbonhidrat tüketip 15 dakika bekleyin.</p>
            </div>
          </div>
          <button
            onClick={() => setIsHypoModalOpen(true)}
            className="px-4 py-2 bg-white text-rose-950 font-black text-xs rounded-xl hover:bg-rose-100 transition-colors shrink-0 shadow-md"
          >
            Acil Rehberi Aç
          </button>
        </motion.div>
      )}

      {/* 4 TOP STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Ortalama Kan Şekeri & Tahmini HbA1c */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-teal-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ortalama KŞ</span>
            <div className="p-2 bg-teal-950 text-teal-400 rounded-xl border border-teal-800/50">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{metrics.avgGlucose}</span>
            <span className="text-xs font-medium text-slate-400">mg/dL</span>
          </div>
          <div className="mt-2 text-xs text-teal-400 font-semibold flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tahmini HbA1c: %{metrics.estHbA1c}</span>
          </div>
        </div>

        {/* Stat 2: Hedefte Kalma (TIR) */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hedefte Kalma (TIR)</span>
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/50">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400">%{metrics.tirPercent}</span>
            <span className="text-xs font-medium text-slate-400">(70-180 mg/dL)</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center space-x-2">
            <span className="text-rose-400 font-semibold">{metrics.hypoCount} Düşük</span>
            <span>•</span>
            <span className="text-orange-400 font-semibold">{metrics.hyperCount} Yüksek</span>
          </div>
        </div>

        {/* Stat 3: Toplam İnsülin (TDD) */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam İnsülin (TDD)</span>
            <div className="p-2 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800/50">
              <Syringe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-cyan-300">{metrics.totalInsulin}</span>
            <span className="text-xs font-medium text-slate-400">Ünite (U)</span>
          </div>
          <div className="mt-2 text-xs text-cyan-400 font-medium">
            Bazal + Bolus Doz Toplamı
          </div>
        </div>

        {/* Stat 4: Toplam Karbonhidrat */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-5 rounded-3xl shadow-xl backdrop-blur-md relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Karbonhidrat</span>
            <div className="p-2 bg-amber-950 text-amber-400 rounded-xl border border-amber-800/50">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-300">{metrics.totalCarbs}</span>
            <span className="text-xs font-medium text-slate-400">Gram (g)</span>
          </div>
          <div className="mt-2 text-xs text-amber-400 font-medium">
            Öğün Karbonhidrat Toplamı
          </div>
        </div>

      </div>

      {/* RECHARTS KAN ŞEKERİ TRENDİ GRAFİĞİ */}
      <GlucoseChart records={records} />

      {/* KRONOLOJİK ZAMAN ÇİZELGESİ LİSTESİ */}
      <LogTimeline records={records} onDeleteRecord={handleDeleteRecord} />

      {/* FORM MODAL */}
      <GlucoseInsulinForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddRecord}
      />

      {/* HYPO EMERGENCY GUIDE MODAL */}
      <HypoGuideModal
        isOpen={isHypoModalOpen}
        onClose={() => setIsHypoModalOpen(false)}
        currentGlucose={hypoValue || metrics.latestGlucose}
      />

      {/* AI ASSISTANT MODAL */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSaveRecord={handleAddRecord}
        patientContext={metrics}
      />

      {/* DIABETES PERSONAL SETTINGS MODAL */}
      <DiabetesSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* FLOATING AI ASSISTANT FAB BUTTON */}
      <button
        onClick={() => setIsAiModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 text-slate-950 font-black shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center space-x-2 border-2 border-white/20 group"
        title="DiaAI Asistanını Aç"
      >
        <Sparkles className="w-6 h-6 text-slate-950 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap text-xs font-bold pl-1">
          DiaAI Asistan
        </span>
      </button>
    </div>
  );
}
