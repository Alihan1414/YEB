'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, Calendar, Clock, Sparkles, Check, X,
  Save, Trash2, ArrowLeft, Tv, ChevronRight, User,
  Coffee, Sun, Moon, Apple, Info, AlertCircle, Loader2
} from 'lucide-react';
import Link from 'next/link';

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

const DAYS_TR = [
  'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
];

export default function MenuPage() {
  const { user, userName, role, institutionId, institutionName, logoUrl, primaryColor, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [dayName, setDayName]           = useState('');
  
  // Menu Form fields
  const [breakfast, setBreakfast]       = useState('');
  const [lunch, setLunch]               = useState('');
  const [dinner, setDinner]             = useState('');
  const [snack, setSnack]               = useState('');
  const [note, setNote]                 = useState('');

  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [allMenus, setAllMenus]         = useState([]);
  const [toast, setToast]               = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (role === 'teacher') {
        router.push('/');
      }
    }
  }, [user, role, authLoading, router]);

  // Update day name when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const d = new Date(selectedDate);
      const day = DAYS_TR[d.getDay()];
      setDayName(day);
    }
  }, [selectedDate]);

  // Fetch menus
  const fetchMenus = useCallback(async () => {
    setLoading(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/food-menu?institutionId=${encodeURIComponent(instId)}&date=${selectedDate}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setAllMenus(data.allMenus || []);
        if (data.menu) {
          setBreakfast(data.menu.breakfast || '');
          setLunch(data.menu.lunch || '');
          setDinner(data.menu.dinner || '');
          setSnack(data.menu.snack || '');
          setNote(data.menu.note || '');
        } else {
          setBreakfast('');
          setLunch('');
          setDinner('');
          setSnack('');
          setNote('');
        }
      }
    } catch (err) {
      console.error('fetchMenus error:', err);
    } finally {
      setLoading(false);
    }
  }, [institutionId, selectedDate]);

  useEffect(() => {
    if (user) {
      fetchMenus();
    }
  }, [user, fetchMenus]);

  // Save Menu
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch('/api/food-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: instId,
          date: selectedDate,
          dayName,
          breakfast,
          lunch,
          dinner,
          snack,
          note,
          updated_by: userName || (role === 'cook' ? 'Aşçı' : 'İdareci')
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${selectedDate} (${dayName}) yemek menüsü kaydedildi!`);
        fetchMenus();
      } else {
        throw new Error(data.error || 'Kaydedilemedi');
      }
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Quick select a date from past/upcoming
  const handleSelectDate = (dStr) => {
    setSelectedDate(dStr);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3 border ${
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {role !== 'cook' && (
            <>
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-all flex items-center gap-1 text-xs font-bold"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Ana Sayfa</span>
              </button>
              <div className="h-6 w-px bg-slate-200" />
            </>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-inner">
              <Utensils size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight flex items-center gap-2">
                {role === 'cook' ? 'Aşçı Paneli' : 'Yemek Menüsü Yönetimi'}
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {role === 'cook' ? '👨‍🍳 Aşçı' : 'Yönetim'}
                </span>
              </h1>
              <p className="text-xs text-slate-500">{institutionName || 'Kurum Mutfağı'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tv"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <Tv size={14} className="text-amber-400" />
            TV Ekranı
          </Link>
          <button
            onClick={logout}
            className="px-3.5 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Date Selector Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-xs font-black uppercase tracking-widest text-amber-100 flex items-center gap-1.5">
              <Calendar size={14} /> GÜNLÜK & HAFTALIK MENÜ GİRİŞİ
            </span>
            <h2 className="text-2xl md:text-3xl font-black mt-1">
              {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="text-amber-200 font-semibold ml-2">({dayName})</span>
            </h2>
            <p className="text-amber-100 text-xs md:text-sm mt-1 max-w-md">
              Girilen menüler anında kuruma ait TV ekranında ve sistemde canlı olarak yayınlanır.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 bg-white/15 backdrop-blur-md p-2 rounded-2xl border border-white/20">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white text-slate-800 font-bold text-xs md:text-sm rounded-xl px-4 py-2.5 outline-none shadow-sm cursor-pointer"
            />
            <button
              onClick={() => setSelectedDate(getTodayString())}
              className="px-3 py-2.5 bg-amber-900/40 hover:bg-amber-900/60 text-white rounded-xl text-xs font-extrabold transition-all shrink-0"
            >
              Bugün
            </button>
          </div>

          <div className="absolute -right-6 -bottom-10 opacity-15 pointer-events-none text-white">
            <Utensils size={180} />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Form: 2 Cols */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Utensils size={18} className="text-amber-500" />
                Öğün Bilgilerini Giriniz
              </h3>
              {loading && <Loader2 size={18} className="text-amber-500 animate-spin" />}
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* 1. Sabah Kahvaltısı */}
              <div className="bg-amber-50/50 border border-amber-100/80 rounded-2xl p-4.5 space-y-2">
                <label className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                  <Coffee size={16} className="text-amber-600" />
                  Sabah Kahvaltısı
                </label>
                <textarea
                  value={breakfast}
                  onChange={e => setBreakfast(e.target.value)}
                  placeholder="Örn: Haşlanmış Yumurta, Beyaz Peynir, Siyah Zeytin, Bal & Tereyağı, Sıcak Çay"
                  rows={2}
                  className="w-full bg-white border border-amber-200/80 rounded-xl p-3 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all resize-none font-medium"
                />
              </div>

              {/* 2. Öğle Yemeği */}
              <div className="bg-orange-50/50 border border-orange-100/80 rounded-2xl p-4.5 space-y-2">
                <label className="text-xs font-black text-orange-900 uppercase tracking-wider flex items-center gap-2">
                  <Sun size={16} className="text-orange-600" />
                  Öğle Yemeği
                </label>
                <textarea
                  value={lunch}
                  onChange={e => setLunch(e.target.value)}
                  placeholder="Örn: Mercimek Çorbası, Tavuk Sote, Pirinç Pilavı, Mevsim Salata, Ayran"
                  rows={2}
                  className="w-full bg-white border border-orange-200/80 rounded-xl p-3 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all resize-none font-medium"
                />
              </div>

              {/* 3. Akşam Yemeği */}
              <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-4.5 space-y-2">
                <label className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                  <Moon size={16} className="text-indigo-600" />
                  Akşam Yemeği
                </label>
                <textarea
                  value={dinner}
                  onChange={e => setDinner(e.target.value)}
                  placeholder="Örn: Yayla Çorbası, Etli Kuru Fasulye, Bulgur Pilavı, Cacık, Meyve"
                  rows={2}
                  className="w-full bg-white border border-indigo-200/80 rounded-xl p-3 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none font-medium"
                />
              </div>

              {/* 4. Ara Öğün / İkindi & Günün Notu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                    <Apple size={16} className="text-emerald-600" />
                    Ara Öğün / İkindi (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={snack}
                    onChange={e => setSnack(e.target.value)}
                    placeholder="Örn: Kek & Meyve Suyu / Poğaça"
                    className="w-full bg-white border border-emerald-200/80 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Info size={16} className="text-slate-500" />
                    Günün Notu / Çorbası
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Örn: Afiyet ve şifa olsun 🤍"
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Menü Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {dayName} Gününün Menüsünü Kaydet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right / Live TV Preview Card: 1 Col */}
          <div className="space-y-6">
            
            {/* TV Ekranı Önizleme Kartı */}
            <div className="bg-[#071735] text-white rounded-3xl p-6 shadow-xl border border-sky-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-sky-500/20 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <Tv size={16} />
                  <span>TV Ekranı Canlı Önizleme</span>
                </div>
                <span className="text-[10px] text-sky-300 font-bold bg-sky-900/60 px-2 py-0.5 rounded-md border border-sky-400/30">
                  {dayName}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* Kahvaltı */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                  <div className="text-amber-400 font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Coffee size={13} /> Sabah Kahvaltısı
                  </div>
                  <div className="text-slate-200 leading-relaxed font-medium">
                    {breakfast || <span className="text-slate-500 italic">Menü girilmedi</span>}
                  </div>
                </div>

                {/* Öğle */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                  <div className="text-orange-400 font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Sun size={13} /> Öğle Yemeği
                  </div>
                  <div className="text-slate-200 leading-relaxed font-medium">
                    {lunch || <span className="text-slate-500 italic">Menü girilmedi</span>}
                  </div>
                </div>

                {/* Akşam */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
                  <div className="text-sky-400 font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Moon size={13} /> Akşam Yemeği
                  </div>
                  <div className="text-slate-200 leading-relaxed font-medium">
                    {dinner || <span className="text-slate-500 italic">Menü girilmedi</span>}
                  </div>
                </div>

                {snack && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-wide mb-0.5">
                      Ara Öğün
                    </div>
                    <div className="text-slate-300 text-[11px]">{snack}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Kayıtlı Diğer Günler Listesi */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={14} className="text-amber-500" />
                Kayıtlı Diğer Günler
              </h4>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {allMenus.map(m => (
                  <button
                    key={m.id || m.date}
                    onClick={() => handleSelectDate(m.date)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                      m.date === selectedDate
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{m.date} - {m.dayName || ''}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {m.lunch || m.dinner || m.breakfast || 'Menü mevcut'}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                ))}
                {allMenus.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    Henüz kayıtlı menü bulunmuyor.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
