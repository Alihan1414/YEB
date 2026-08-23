'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Play, RotateCcw, X, ShieldAlert, CheckCircle, HeartPulse } from 'lucide-react';

export default function HypoGuideModal({ isOpen, onClose, currentGlucose }) {
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(sec => sec - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  if (!isOpen) return null;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setTimerSeconds(15 * 60);
    setTimerActive(true);
  };

  const resetTimer = () => {
    setTimerActive(false);
    setTimerSeconds(15 * 60);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border-2 border-rose-600/70 rounded-3xl shadow-2xl overflow-hidden my-6"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-rose-700 via-red-600 to-amber-600 p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md">
                <ShieldAlert className="w-8 h-8 text-rose-100 animate-bounce" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-wide flex items-center space-x-2">
                  <span>HİPOGLİSEMİ REHBERİ</span>
                </h2>
                <p className="text-xs text-rose-100 font-semibold mt-0.5">
                  Ölçülen Kan Şekeri: <span className="underline font-bold text-white text-sm">{currentGlucose ? `${currentGlucose} mg/dL` : 'Düşük'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 15-15 Rule Box */}
            <div className="bg-rose-950/40 border border-rose-800/60 p-4 rounded-2xl space-y-3">
              <h3 className="text-sm font-extrabold text-rose-300 flex items-center space-x-2">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span>Altın Kural: 15 - 15 Kuralı</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kan şekeri <strong className="text-rose-400">70 mg/dL altına</strong> düştüğünde hücreleriniz enerji açlığı çeker. Aşırı yemekten kaçınarak adım adım müdahale edin:
              </p>

              {/* Steps */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-start space-x-2 bg-slate-900/80 p-2.5 rounded-xl border border-rose-900/50">
                  <span className="bg-rose-500 text-slate-950 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div className="text-slate-200">
                    <strong className="text-rose-300">15g Hızlı Karbonhidrat Tüketin:</strong>
                    <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5">
                      <li>4 adet küp şeker (suda eritip veya emerek)</li>
                      <li>150 ml (1 çay bardağı) meyve suyu</li>
                      <li>1 tüp glukoz jeli / 3-4 glukoz tableti</li>
                    </ul>
                    <p className="text-[11px] text-amber-400/90 mt-1">⚠️ Çikolata/yağlı tatlılar tüketmeyin (yağ emilimi yavaşlatır!).</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 bg-slate-900/80 p-2.5 rounded-xl border border-rose-900/50">
                  <span className="bg-rose-500 text-slate-950 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div className="text-slate-200">
                    <strong className="text-amber-300"> Dinlenin ve 15 Dakika Bekleyin:</strong>
                    <p className="text-slate-400 mt-0.5">Kan şekerinizin yükselmesi için vücudunuza 15 dakika zaman tanıyın. Ekstra insülin yapmayın!</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 bg-slate-900/80 p-2.5 rounded-xl border border-rose-900/50">
                  <span className="bg-rose-500 text-slate-950 font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div className="text-slate-200">
                    <strong className="text-teal-300">Tekrar Ölçüm Yapın:</strong>
                    <p className="text-slate-400 mt-0.5">15 dk sonra tekrar ölçün. Hala &lt; 70 mg/dL ise 1. Adımı tekrarlayın.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 15 Minute Timer Component */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-center space-y-3">
              <div className="text-xs text-slate-400 font-medium flex items-center justify-center space-x-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>15 Dakikalık Bekleme Zamanlayıcısı</span>
              </div>

              <div className="text-4xl font-extrabold font-mono text-amber-400 tracking-wider">
                {formatTimer(timerSeconds)}
              </div>

              <div className="flex items-center justify-center space-x-3 pt-1">
                {!timerActive ? (
                  <button
                    onClick={startTimer}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md transition-all"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Zamanlayıcıyı Başlat</span>
                  </button>
                ) : (
                  <button
                    onClick={resetTimer}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-1.5 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Sıfırla</span>
                  </button>
                )}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-colors"
            >
              Anlaşıldı, Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
