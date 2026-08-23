'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Activity, Syringe, Utensils, Clock, AlertTriangle,
  CheckCircle2, Plus, Minus, Tag, MapPin, Sparkles
} from 'lucide-react';

const MEAL_TAGS = [
  { id: 'aclik', label: 'Açlık (Sabah/Öğün öncesi)', icon: '🌅' },
  { id: 'tokluk', label: 'Tokluk (Yemekten 2 saat sonra)', icon: '🍱' },
  { id: 'gece', label: 'Yatmadan Önce / Gece', icon: '🌙' },
  { id: 'spor_oncesi', label: 'Egzersiz Öncesi', icon: '🏃‍♂️' },
  { id: 'spor_sonrasi', label: 'Egzersiz Sonrası', icon: '🧘‍♀️' },
  { id: 'stres', label: 'Stres / Hastalık', icon: '🤒' },
  { id: 'genel', label: 'Genel Ölçüm', icon: '📍' },
];

const INSULIN_TYPES = [
  { id: 'bolus', name: 'Bolus (Hızlı Etkili)', sub: 'Novorapid, Humalog, Fiasp vb.', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { id: 'bazal', name: 'Bazal (Uzun Etkili)', sub: 'Lantus, Levemir, Tresiba vb.', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { id: 'duzeltme', name: 'Düzeltme Dozu', sub: 'Yüksek Şekeri Düşürme', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
];

const BODY_SITES = [
  'Göbek (Karın)', 'Sağ Kol', 'Sol Kol', 'Sağ Uyluk (Bacak)', 'Sol Uyluk (Bacak)', 'Kalça'
];

const MEAL_TYPES = ['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Ara Öğün', 'Gece Atıştırmalığı'];

export default function GlucoseInsulinForm({ isOpen, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('kombine'); // 'kombine' | 'seker' | 'insulin' | 'karb'

  // Values
  const [glucose, setGlucose] = useState(120);
  const [hasGlucose, setHasGlucose] = useState(true);

  const [insulinUnits, setInsulinUnits] = useState(0);
  const [insulinType, setInsulinType] = useState('bolus');
  const [insulinSite, setInsulinSite] = useState('Göbek (Karın)');

  const [carbs, setCarbs] = useState(0);
  const [mealType, setMealType] = useState('Kahvaltı');

  const [mealTag, setMealTag] = useState('aclik');
  const [notes, setNotes] = useState('');
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  if (!isOpen) return null;

  const getGlucoseStatus = (val) => {
    if (!val || val <= 0) return { label: 'Girilmedi', color: 'text-slate-400', bg: 'bg-slate-800' };
    if (val < 54) return { label: 'AĞIR HİPO (Çok Düşük)', color: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-500/50', badge: 'bg-rose-500 text-white' };
    if (val < 70) return { label: 'HİPOGLİSEMİ (Düşük)', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-500/50', badge: 'bg-amber-500 text-slate-950' };
    if (val <= 180) return { label: 'HEDEF ARALIKTA (Normal)', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-500/50', badge: 'bg-emerald-500 text-slate-950' };
    if (val <= 250) return { label: 'YÜKSEK (HİPER)', color: 'text-orange-400', bg: 'bg-orange-950/60 border-orange-500/50', badge: 'bg-orange-500 text-slate-950' };
    return { label: 'ÇOK YÜKSEK (Keton Kontrolü!)', color: 'text-purple-400', bg: 'bg-purple-950/60 border-purple-500/50', badge: 'bg-purple-500 text-white' };
  };

  const statusInfo = getGlucoseStatus(glucose);

  const handleSubmit = (e) => {
    e.preventDefault();

    const record = {
      id: Date.now().toString(),
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      glucose: hasGlucose && glucose > 0 ? Number(glucose) : null,
      insulinUnits: Number(insulinUnits) > 0 ? Number(insulinUnits) : 0,
      insulinType: Number(insulinUnits) > 0 ? insulinType : null,
      insulinSite: Number(insulinUnits) > 0 ? insulinSite : null,
      carbs: Number(carbs) > 0 ? Number(carbs) : 0,
      mealType: Number(carbs) > 0 ? mealType : null,
      tag: mealTag,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    onSave(record);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          {/* Top Decorative Banner */}
          <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
                <Activity className="w-7 h-7 text-teal-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-wide">Yeni Veri Kaydı</h2>
                <p className="text-xs text-teal-100/80">Kan şekeri, insülin dozu ve karbonhidrat takibi</p>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl mt-4 text-xs font-semibold backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setActiveTab('kombine')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  activeTab === 'kombine' ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-white/80 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hızlı Kayıt</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('seker'); setHasGlucose(true); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  activeTab === 'seker' ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-white/80 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Kan Şekeri</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('insulin')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  activeTab === 'insulin' ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-white/80 hover:text-white'
                }`}
              >
                <Syringe className="w-3.5 h-3.5" />
                <span>İnsülin</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('karb')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center space-x-1 ${
                  activeTab === 'karb' ? 'bg-white text-slate-900 shadow-md font-bold' : 'text-white/80 hover:text-white'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Karbonhidrat</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
            
            {/* 1. KAN ŞEKERİ BÖLÜMÜ */}
            {(activeTab === 'kombine' || activeTab === 'seker') && (
              <div className={`p-5 rounded-2xl border transition-all ${statusInfo.bg}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-teal-400" />
                    <span>Kan Şekeri Ölçümü (mg/dL)</span>
                  </label>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.badge}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center space-x-3 my-2">
                  <button
                    type="button"
                    onClick={() => setGlucose(prev => Math.max(30, Number(prev) - 5))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 text-lg transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="30"
                      max="600"
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      className="w-full text-center text-3xl font-extrabold bg-slate-900/90 border border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      mg/dL
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setGlucose(prev => Math.min(600, Number(prev) + 5))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 text-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[65, 90, 110, 140, 180, 220, 280].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGlucose(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        Number(glucose) === val
                          ? 'bg-teal-500 text-slate-950 border-teal-400 font-bold'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>

                {/* Hypo Warning Banner */}
                {glucose > 0 && glucose < 70 && (
                  <div className="mt-4 p-3 bg-rose-900/50 border border-rose-600/60 rounded-xl flex items-start space-x-3 text-xs text-rose-200">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-300">Hipoglisemi Tespiti!</p>
                      <p className="mt-0.5">Kan şekeriniz düşük. 15g hızlı etkili karbonhidrat (3-4 küp şeker veya meyve suyu) tüketin ve 15 dk sonra tekrar ölçün (15-15 Kuralı).</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. İNSÜLİN BÖLÜMÜ */}
            {(activeTab === 'kombine' || activeTab === 'insulin') && (
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Syringe className="w-4 h-4 text-cyan-400" />
                    <span>İnsülin Dozu (Ünite - U)</span>
                  </label>
                  <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/50">
                    {insulinUnits} Ünite (U)
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setInsulinUnits(prev => Math.max(0, (Number(prev) - 0.5)).toFixed(1))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 text-lg transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={insulinUnits}
                    onChange={(e) => setInsulinUnits(e.target.value)}
                    className="w-full text-center text-3xl font-extrabold bg-slate-900 border border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />

                  <button
                    type="button"
                    onClick={() => setInsulinUnits(prev => (Number(prev) + 0.5).toFixed(1))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 text-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Insulin Types */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">İnsülin Türü</label>
                  <div className="grid grid-cols-3 gap-2">
                    {INSULIN_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setInsulinType(t.id)}
                        className={`p-3 rounded-xl text-left border text-xs transition-all ${
                          insulinType === t.id
                            ? t.color + ' border-2 shadow-lg font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{t.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Site */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Enjeksiyon Bölgesi</span>
                  </label>
                  <select
                    value={insulinSite}
                    onChange={(e) => setInsulinSite(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {BODY_SITES.map((site) => (
                      <option key={site} value={site}>{site}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 3. KARBONHİDRAT BÖLÜMÜ */}
            {(activeTab === 'kombine' || activeTab === 'karb') && (
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                    <Utensils className="w-4 h-4 text-amber-400" />
                    <span>Karbonhidrat Miktarı (g)</span>
                  </label>
                  <span className="text-xs font-semibold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/50">
                    {carbs} g Karbonhidrat
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setCarbs(prev => Math.max(0, Number(prev) - 5))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 text-lg transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full text-center text-3xl font-extrabold bg-slate-900 border border-slate-700 rounded-xl py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />

                  <button
                    type="button"
                    onClick={() => setCarbs(prev => Math.min(300, Number(prev) + 5))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold border border-slate-700 text-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {[10, 15, 30, 45, 60, 75, 90].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCarbs(val)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        Number(carbs) === val
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {val}g
                    </button>
                  ))}
                </div>

                {/* Meal Type */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Öğün Tipi</label>
                  <div className="flex flex-wrap gap-2">
                    {MEAL_TYPES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMealType(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          mealType === m
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. ETİKETLER & ZAMAN & NOTLAR */}
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-teal-400" />
                  <span>Ölçüm Durumu / Zaman Etiketi</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MEAL_TAGS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMealTag(t.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left flex items-center space-x-2 transition-all ${
                        mealTag === t.id
                          ? 'bg-teal-950/70 border-teal-500 text-teal-200 font-bold shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timestamp & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tarih & Saat</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Not / Açıklama (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Yürüyüş yapıldı, stresli gün..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center space-x-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Kaydı Kaydet</span>
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
