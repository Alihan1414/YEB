'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Syringe, Utensils, Trash2, Filter,
  Clock, Tag, AlertCircle, ChevronDown, CheckCircle2, MessageSquare
} from 'lucide-react';

const TAG_MAP = {
  aclik: { label: 'Açlık', icon: '🌅' },
  tokluk: { label: 'Tokluk (2. saat)', icon: '🍱' },
  gece: { label: 'Gece / Yatmadan', icon: '🌙' },
  spor_oncesi: { label: 'Spor Öncesi', icon: '🏃‍♂️' },
  spor_sonrasi: { label: 'Spor Sonrası', icon: '🧘‍♀️' },
  stres: { label: 'Stres / Hastalık', icon: '🤒' },
  genel: { label: 'Genel', icon: '📍' },
};

export default function LogTimeline({ records = [], onDeleteRecord }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'hypo' | 'hyper' | 'insulin' | 'carbs'

  const filteredRecords = records.filter(r => {
    if (filter === 'hypo') return r.glucose !== null && r.glucose < 70;
    if (filter === 'hyper') return r.glucose !== null && r.glucose > 180;
    if (filter === 'insulin') return r.insulinUnits && r.insulinUnits > 0;
    if (filter === 'carbs') return r.carbs && r.carbs > 0;
    return true;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const getGlucoseBadge = (bg) => {
    if (bg === null || bg === undefined) return null;
    if (bg < 54) return { text: `${bg} mg/dL (Çok Düşük)`, bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    if (bg < 70) return { text: `${bg} mg/dL (Hipoglisemi)`, bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (bg <= 180) return { text: `${bg} mg/dL (Hedefte)`, bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (bg <= 250) return { text: `${bg} mg/dL (Yüksek)`, bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
    return { text: `${bg} mg/dL (Çok Yüksek)`, bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 backdrop-blur-md">
      {/* Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-slate-100 text-lg flex items-center space-x-2">
            <Clock className="w-5 h-5 text-teal-400" />
            <span>Kayıt Geçmişi & Zaman Çizelgesi</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Toplam {filteredRecords.length} ölçüm ve doz kaydı listeleniyor</p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'hypo', label: '🔴 Hipoglisemi' },
            { id: 'hyper', label: '🟧 Yüksek' },
            { id: 'insulin', label: '💉 İnsülinler' },
            { id: 'carbs', label: '🍞 Karbonhidrat' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filter === f.id
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <Filter className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Bu filtre kriterine uygun kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3 relative before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          <AnimatePresence>
            {filteredRecords.map((r) => {
              const bgBadge = getGlucoseBadge(r.glucose);
              const tagInfo = TAG_MAP[r.tag] || { label: r.tag, icon: '📍' };
              const dateObj = new Date(r.timestamp);
              const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
              const dateStr = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative pl-12 group"
                >
                  {/* Timeline Point */}
                  <div className={`absolute left-3.5 top-4 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-slate-900 ${
                    r.glucose < 70 ? 'border-rose-500' : r.glucose > 180 ? 'border-orange-500' : 'border-teal-500'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      r.glucose < 70 ? 'bg-rose-500' : r.glucose > 180 ? 'bg-orange-500' : 'bg-teal-500'
                    }`} />
                  </div>

                  {/* Card Container */}
                  <div className="bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 p-4 rounded-2xl transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    <div className="space-y-2 flex-1">
                      {/* Top Row: Date, Time & Meal Tag */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          ⏰ {timeStr}
                        </span>
                        <span className="text-slate-400">{dateStr}</span>
                        <span className="bg-teal-950/60 text-teal-300 border border-teal-800/50 px-2.5 py-0.5 rounded-full font-medium flex items-center space-x-1">
                          <span>{tagInfo.icon}</span>
                          <span>{tagInfo.label}</span>
                        </span>
                      </div>

                      {/* Main Metrics Row */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Blood Glucose Badge */}
                        {r.glucose !== null && r.glucose !== undefined && (
                          <div className={`px-3 py-1.5 rounded-xl border text-sm font-extrabold flex items-center space-x-1.5 ${bgBadge.bg}`}>
                            <Activity className="w-4 h-4" />
                            <span>{r.glucose} mg/dL</span>
                          </div>
                        )}

                        {/* Insulin Badge */}
                        {r.insulinUnits > 0 && (
                          <div className="bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                            <Syringe className="w-4 h-4 text-cyan-400" />
                            <span>{r.insulinUnits} U ({r.insulinType || 'Bolus'})</span>
                            {r.insulinSite && <span className="text-cyan-400/70 text-[10px]">[{r.insulinSite}]</span>}
                          </div>
                        )}

                        {/* Carbs Badge */}
                        {r.carbs > 0 && (
                          <div className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                            <Utensils className="w-4 h-4 text-amber-400" />
                            <span>{r.carbs}g Karbonhidrat</span>
                            {r.mealType && <span className="text-amber-400/70 text-[10px]">({r.mealType})</span>}
                          </div>
                        )}
                      </div>

                      {/* Notes if any */}
                      {r.notes && (
                        <div className="text-xs text-slate-400 italic bg-slate-900/60 p-2 rounded-xl border border-slate-800/50 flex items-center space-x-1.5 max-w-xl">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>"{r.notes}"</span>
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteRecord(r.id)}
                      className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 transition-colors self-end sm:self-center"
                      title="Kaydı Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
