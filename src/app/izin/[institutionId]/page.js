'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Calendar, Clock, Phone, User, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export default function StudentLeaveForm() {
  const params = useParams();
  const institutionId = params?.institutionId || 'bolu-kilicaslan';

  const [studentName, setStudentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [startDate, setStartDate]     = useState('');
  const [startTime, setStartTime]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [endTime, setEndTime]         = useState('');
  const [reason, setReason]           = useState('');

  const [students, setStudents]       = useState([]);

  // Kurum adını türet
  const instName = (() => {
    const clean = (institutionId || '').toLowerCase();
    if (clean.includes('kilicaslan') || clean.includes('kilicarslan')) return 'Bolu Kılıçarslan';
    if (clean.includes('erenler') || clean.includes('cinardere')) return 'Çınardere Erenler';
    if (clean.includes('pendik')) return 'Pendik Talebe Yurdu';
    if (clean.includes('yamanevler')) return 'Yamanevler Enderun Bilişim';
    return institutionId;
  })();

  const [loading, setLoading]         = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState('');

  const [settings, setSettings] = useState({ enabled: true, assignedTeacherId: '' });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Kurum ayarlarını ve kayıtlı öğrenci listesini yükle
  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsRes, studentsRes] = await Promise.all([
          fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(institutionId)}`),
          fetch(`/api/students?institutionId=${encodeURIComponent(institutionId)}`)
        ]);

        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.settings) {
          setSettings(settingsData.settings);
        }

        const studentsData = await studentsRes.json();
        if (studentsData.success && studentsData.students) {
          setStudents(studentsData.students);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadData();
  }, [institutionId]);

  // Öğrenci seçildiğinde veli telefonunu otomatik doldur
  const handleStudentNameChange = (val) => {
    setStudentName(val);
    const matched = students.find(s => `${s.name} ${s.surname}`.trim().toLowerCase() === val.trim().toLowerCase());
    if (matched && matched.parent_phone && !parentPhone) {
      setParentPhone(matched.parent_phone);
    }
  };

  // Başlangıç tarihi seçildiğinde bitiş tarihi boşsa otomatik doldur
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (!endDate) {
      setEndDate(val);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, parentPhone, startDate, startTime, endDate, endTime, reason, institutionId })
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

  const inputCls = "w-full bg-white/6 border border-white/12 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-blue-400/60 focus:ring-2 focus:ring-blue-400/20 transition-all font-medium";

  return (
    <div
      className="min-h-screen flex items-start justify-center relative overflow-x-hidden px-3 pt-6 pb-10 sm:px-4 sm:py-12"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)' }}
    >
      {/* Background blobs */}
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
        <div className="text-center mb-5 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl mb-3 text-emerald-400">
            <Calendar size={22} />
          </div>
          {instName && (
            <div className="block mb-2">
              <span className="inline-block px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-black tracking-wide">
                {instName}
              </span>
            </div>
          )}
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight uppercase leading-tight">
            Öğrenci İzin Talep Formu
          </h1>
          <p className="text-blue-200/70 text-xs sm:text-sm mt-1.5">
            İzin talebinizi oluşturup değerlendirilmek üzere kuruma gönderin.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/8 backdrop-blur-2xl border border-white/12 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          <AnimatePresence mode="wait">

            {/* Loading state */}
            {loadingSettings ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10">
                <Loader2 size={28} className="text-emerald-400 animate-spin mb-3" />
                <p className="text-blue-200 text-xs font-semibold">Yükleniyor...</p>
              </motion.div>

            ) : !submitted ? (
              /* Form */
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-4"
                exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>

                {/* Datalist for registered students */}
                <datalist id="studentsDatalist">
                  {students.map(s => (
                    <option key={s.id} value={`${s.name} ${s.surname}`.trim()}>
                      {s.class ? `Sınıf: ${s.class}` : ''}
                    </option>
                  ))}
                </datalist>

                {/* Öğrenci Adı */}
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-1.5 block">
                    Öğrenci Adı Soyadı <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/50" />
                    <input
                      type="text"
                      list="studentsDatalist"
                      required
                      value={studentName}
                      onChange={e => handleStudentNameChange(e.target.value)}
                      placeholder="Öğrencinin Adı ve Soyadı"
                      className={`${inputCls} pl-9 pr-3 py-3 text-sm`}
                    />
                  </div>
                  {students.length > 0 && (
                    <p className="text-[10px] text-blue-300/50 mt-1 pl-1">
                      💡 İsmi yazmaya başladığınızda kayıtlı öğrenciler listelenir.
                    </p>
                  )}
                </div>

                {/* Veli Telefon */}
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-1.5 block">
                    Veli Telefon Numarası <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/50" />
                    <input type="tel" required value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                      placeholder="05xxxxxxxxx"
                      className={`${inputCls} pl-9 pr-3 py-3 text-sm`} />
                  </div>
                </div>

                {/* Tarih / Saat — 2 sütun her boyutta */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest mb-1.5 block">
                      Başlangıç Tarihi <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input type="date" required value={startDate}
                        onChange={e => handleStartDateChange(e.target.value)}
                        className={`${inputCls} pl-8 pr-1 py-2.5 text-xs`} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest mb-1.5 block">
                      Başlangıç Saati
                    </label>
                    <div className="relative">
                      <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input type="time" value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className={`${inputCls} pl-8 pr-1 py-2.5 text-xs`} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest mb-1.5 block">
                      Bitiş Tarihi
                    </label>
                    <div className="relative">
                      <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input type="date" value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className={`${inputCls} pl-8 pr-1 py-2.5 text-xs`} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-blue-200/80 uppercase tracking-widest mb-1.5 block">
                      Bitiş Saati
                    </label>
                    <div className="relative">
                      <Clock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-300/50" />
                      <input type="time" value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className={`${inputCls} pl-8 pr-1 py-2.5 text-xs`} />
                    </div>
                  </div>
                </div>

                {/* Neden */}
                <div>
                  <label className="text-[10px] sm:text-xs font-bold text-blue-200/80 uppercase tracking-widest mb-1.5 block">
                    İzin Talep Nedeni <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <FileText size={14} className="absolute left-3 top-3.5 text-blue-300/50" />
                    <textarea required rows={3} value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="İzin talep gerekçesini detaylıca açıklayınız..."
                      className={`${inputCls} pl-9 pr-3 py-3 text-sm resize-none`} />
                  </div>
                </div>

                {/* Hata */}
                {error && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2.5 text-center font-semibold">
                    ⚠ {error}
                  </motion.div>
                )}

                {/* Gönder */}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 mt-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-sm hover:from-emerald-400 hover:to-teal-500 transition-all duration-300 shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'İzin Talebini Gönder'}
                </button>
              </motion.form>

            ) : (
              /* Başarı */
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 animate-bounce mb-2">
                  <CheckCircle size={36} />
                </div>
                <h2 className="text-xl font-black text-white">İzin Talebiniz Alındı!</h2>
                <p className="text-blue-200/70 text-sm max-w-sm mx-auto leading-relaxed">
                  Talebiniz sistemdeki görevli öğretmenlerimize başarıyla iletilmiştir. Onay veya ret durumunda velinize WhatsApp üzerinden bilgi gönderilecektir.
                </p>
                <button
                  onClick={() => { setStudentName(''); setParentPhone(''); setStartDate(''); setStartTime(''); setEndDate(''); setEndTime(''); setReason(''); setSubmitted(false); }}
                  className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/16 border border-white/20 text-white text-xs font-bold rounded-xl transition-all">
                  Yeni İzin Talebi Oluştur
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-blue-200/40 text-xs mt-5">
          Talebe Takip ve Raporlama Sistemi © 2026
        </p>
      </motion.div>
    </div>
  );
}
