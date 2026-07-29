'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Calendar, Clock, Phone, User, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export default function StudentLeaveForm() {
  const params = useParams();
  const institutionId = params?.institutionId || 'yamanevler';

  const [studentName, setStudentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [startDate, setStartDate]     = useState('');
  const [startTime, setStartTime]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [endTime, setEndTime]         = useState('');
  const [reason, setReason]           = useState('');

  const [loading, setLoading]         = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState('');

  // Settings state
  const [settings, setSettings] = useState({ enabled: true, assignedTeacherId: '' });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(institutionId)}`);
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [institutionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          parentPhone,
          startDate,
          startTime,
          endDate,
          endTime,
          reason,
          institutionId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Talep gönderilemedi. Lütfen tüm alanları kontrol edin.');
      }
    } catch (err) {
      setError('Bağlantı hatası gerçekleşti. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)' }}>
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-xl relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl mb-4 text-emerald-400">
            <Calendar size={28} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Öğrenci İzin Talep Formu</h1>
          <p className="text-blue-200/70 text-sm mt-2">İzin talebinizi oluşturup değerlendirilmek üzere gönderin.</p>
        </div>

        {/* Card Form */}
        <div className="bg-white/8 backdrop-blur-2xl border border-white/12 rounded-3xl p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <AnimatePresence mode="wait">
            {loadingSettings ? (
              <motion.div
                key="loading-settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 size={32} className="text-emerald-400 animate-spin mb-3" />
                <p className="text-blue-200 text-xs font-semibold">Ayarlar yükleniyor...</p>
              </motion.div>
            ) : !settings.enabled ? (
              <motion.div
                key="disabled"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 space-y-4"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse mb-2">
                  <AlertTriangle size={44} />
                </div>
                <h2 className="text-2xl font-black text-white">İzin Talepleri Kapatılmıştır</h2>
                <p className="text-blue-200/70 text-sm max-w-sm mx-auto leading-relaxed">
                  Kurumumuz şu anda yeni izin taleplerini kabul etmemektedir. Lütfen doğrudan kurum yetkilileri ile iletişime geçiniz.
                </p>
              </motion.div>
            ) : !submitted ? (
              <motion.form
                key="leave-form"
                onSubmit={handleSubmit}
                className="space-y-5"
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {/* Student Name */}
                <div>
                  <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                    Öğrenci Adı Soyadı <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                    <input
                      type="text"
                      required
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      placeholder="Adı ve Soyadı"
                      className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Parent Phone */}
                <div>
                  <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                    Veli Telefon Numarası <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                    <input
                      type="tel"
                      required
                      value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                      placeholder="05xxxxxxxxx"
                      className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Dates & Hours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                      İzin Başlangıç Tarihi <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input
                        type="date"
                        required
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                      İzin Başlangıç Saati
                    </label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                      İzin Bitiş Tarihi
                    </label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                      İzin Bitiş Saati
                    </label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-2 block">
                    İzin Talep Nedeni <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-4 top-4 text-blue-300/50" />
                    <textarea
                      required
                      rows={3}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="İzin talep gerekçesini detaylıca açıklayınız..."
                      className="w-full bg-white/6 border border-white/12 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all text-sm font-medium resize-none"
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-3 text-center font-semibold"
                  >
                    ⚠ {error}
                  </motion.div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-sm hover:from-emerald-400 hover:to-teal-500 transition-all duration-300 shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'İzin Talebini Gönder'
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="submitted-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-bounce mb-2">
                  <CheckCircle size={44} />
                </div>
                <h2 className="text-2xl font-black text-white">İzin Talebiniz Alındı!</h2>
                <p className="text-blue-200/70 text-sm max-w-sm mx-auto leading-relaxed">
                  Talebiniz sistemdeki görevli öğretmenlerimize başarıyla iletilmiştir. Onay veya red durumunda velinize WhatsApp üzerinden bilgi gönderilecektir.
                </p>
                <button
                  onClick={() => {
                    setStudentName('');
                    setParentPhone('');
                    setStartDate('');
                    setStartTime('');
                    setEndDate('');
                    setEndTime('');
                    setReason('');
                    setSubmitted(false);
                  }}
                  className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/16 border border-white/20 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Yeni İzin Talebi Oluştur
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-blue-200/40 text-xs mt-6">
          Enderun Bilişim Raporlama ve İzin Takip Sistemi © 2026
        </p>
      </motion.div>
    </div>
  );
}
