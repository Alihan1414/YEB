'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Save, Sliders, Activity, Syringe, Target, Clock, ShieldCheck, HeartPulse } from 'lucide-react';

const DEFAULT_SETTINGS = {
  icrMorning: 10,  // 1U per 10g carbs in morning
  icrLunch: 12,    // 1U per 12g carbs at lunch
  icrDinner: 12,   // 1U per 12g carbs at dinner
  isf: 40,         // 1U lowers BG by 40 mg/dL
  targetGlucose: 110, // Target BG: 110 mg/dL
  diaHours: 3.5,   // Insulin duration of action: 3.5 hours
  bolusBrand: 'Novorapid',
  basalBrand: 'Lantus',
  bgUnit: 'mg/dL',
};

export default function DiabetesSettingsModal({ isOpen, onClose, onSaveSettings }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('td1_diyabet_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Settings load error:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('td1_diyabet_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Settings save error:', e);
    }
    if (onSaveSettings) onSaveSettings(settings);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 via-cyan-700 to-indigo-700 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md">
                <Sliders className="w-7 h-7 text-teal-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-wide">Kişisel Diyabet Ayarları</h2>
                <p className="text-xs text-teal-100/90">ICR, ISF, Hedef Kan Şekeri ve İnsülin parametreleriniz</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar text-xs">
            
            {/* ICR Section */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-teal-300 flex items-center space-x-2">
                <Syringe className="w-4 h-4 text-teal-400" />
                <span>ICR (İnsülin / Karbonhidrat Oranı)</span>
              </h3>
              <p className="text-slate-400 text-[11px]">
                1 Ünite hızlı insülinin kaç gram karbonhidratı karşıladığını belirler.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Sabah ICR (g)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={settings.icrMorning}
                      onChange={(e) => handleChange('icrMorning', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-white text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">g/U</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Öğle ICR (g)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={settings.icrLunch}
                      onChange={(e) => handleChange('icrLunch', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-white text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">g/U</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Akşam ICR (g)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={settings.icrDinner}
                      onChange={(e) => handleChange('icrDinner', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-white text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">g/U</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ISF & Target BG Section */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-cyan-300 flex items-center space-x-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>ISF (İnsülin Hassasiyet Faktörü) & Hedef Kan Şekeri</span>
              </h3>
              <p className="text-slate-400 text-[11px]">
                1 Ünite düzeltme insülininin kan şekerinizi kaç mg/dL düşürdüğünü ve hedef seviyenizi girin.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">ISF (Hassasiyet)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5"
                      value={settings.isf}
                      onChange={(e) => handleChange('isf', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-white text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">mg/dL</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hedef KŞ (mg/dL)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="70"
                      max="150"
                      value={settings.targetGlucose}
                      onChange={(e) => handleChange('targetGlucose', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-center font-bold text-white text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">mg/dL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Insulin Brands & Duration */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
              <h3 className="font-bold text-sm text-amber-300 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>İnsülin Türleri & Aktif İnsülin Süresi (DIA)</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hızlı İnsülin</label>
                  <select
                    value={settings.bolusBrand}
                    onChange={(e) => handleChange('bolusBrand', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-200 font-medium"
                  >
                    <option value="Novorapid">Novorapid</option>
                    <option value="Humalog">Humalog</option>
                    <option value="Fiasp">Fiasp</option>
                    <option value="Apidra">Apidra</option>
                    <option value="Pompa">İnsülin Pompası</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Uzun İnsülin</label>
                  <select
                    value={settings.basalBrand}
                    onChange={(e) => handleChange('basalBrand', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-slate-200 font-medium"
                  >
                    <option value="Lantus">Lantus</option>
                    <option value="Tresiba">Tresiba</option>
                    <option value="Levemir">Levemir</option>
                    <option value="Toujeo">Toujeo</option>
                    <option value="Yok">Yok (Pompa)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Aktif Süre (DIA)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      max="6"
                      value={settings.diaHours}
                      onChange={(e) => handleChange('diaHours', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-center font-bold text-white"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">saat</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
              >
                İptal
              </button>

              <button
                type="submit"
                className="w-2/3 py-3 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-slate-950 font-black shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>Ayarları Kaydet</span>
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
