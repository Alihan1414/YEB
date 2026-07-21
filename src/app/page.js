'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Search, Plus, Check, X, FileText,
  User, Clock, Sparkles, ChevronRight, TrendingUp,
  GraduationCap, Utensils, AlertCircle,
  ClipboardList, BarChart2, LogOut, Shield, Upload,
  Loader2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useAuth } from '@/lib/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Akademik: '#8b5cf6', Yemek: '#f59e0b',
  Program:  '#06b6d4', Diğer: '#6b7280',
};
const CATEGORY_ICONS = {
  Akademik: GraduationCap, Yemek: Utensils,
  Program:  ClipboardList, Diğer: FileText,
};
const CATEGORIES = ['Akademik', 'Yemek', 'Program', 'Diğer'];

// ─── Utility ─────────────────────────────────────────────────────────────────
function tsToString(ts) {
  if (!ts) return '';
  if (ts instanceof Timestamp) return ts.toDate().toLocaleString('tr-TR');
  if (typeof ts === 'string') return new Date(ts).toLocaleString('tr-TR');
  return '';
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { user, role, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [students, setStudents]               = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reports, setReports]                 = useState([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedClass, setSelectedClass]     = useState('All');
  const [dataLoading, setDataLoading]         = useState(true);

  // Voice & AI
  const [isListening, setIsListening]  = useState(false);
  const [voiceText, setVoiceText]      = useState('');
  const [isAnalyzing, setIsAnalyzing]  = useState(false);
  const [aiMatch, setAiMatch]          = useState(null);
  const [textInput, setTextInput]      = useState('');
  const [notifyParent, setNotifyParent] = useState(false);

  // Direct report form
  const [directText, setDirectText]         = useState('');
  const [directCategory, setDirectCategory] = useState('Akademik');

  // Add student form
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newName, setNewName]               = useState('');
  const [newSurname, setNewSurname]         = useState('');
  const [newClass, setNewClass]             = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');

  // CSV import
  const [showCSV, setShowCSV]     = useState(false);
  const [csvError, setCsvError]   = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const fileInputRef              = useRef(null);

  // Toast
  const [toast, setToast] = useState(null);
  const recognitionRef    = useRef(null);

  // Program modal states
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [progName, setProgName]                 = useState('');
  const [progStatus, setProgStatus]             = useState('Katıldı');
  const [progClass, setProgClass]               = useState('All');
  const [progNotes, setProgNotes]               = useState('');

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => { if (user) fetchStudents(); }, [user]);
  useEffect(() => { if (selectedStudent) fetchReports(selectedStudent.id); }, [selectedStudent]);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    setDataLoading(true);
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (e) { console.error(e); }
    finally { setDataLoading(false); }
  };

  const fetchReports = async (studentId) => {
    try {
      const res = await fetch(`/api/students/reports?studentId=${studentId}`);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (e) { console.error(e); }
  };

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Speech ────────────────────────────────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Chrome tarayıcısı gerekli.'); return; }
    const rec = new SR();
    rec.lang = 'tr-TR'; rec.continuous = false; rec.interimResults = false;
    rec.onstart = () => { setIsListening(true); setVoiceText(''); setAiMatch(null); };
    rec.onresult = e => { const t = e.results[0][0].transcript; setVoiceText(t); analyzeWithAI(t); };
    rec.onerror  = () => setIsListening(false);
    rec.onend    = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
  };
  const stopListening = () => recognitionRef.current?.stop();

  // ─── AI Analysis ───────────────────────────────────────────────────────────
  const analyzeWithAI = async (text) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/students/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) setAiMatch(data.data);
      else showToast('Yapay zekâ analizi başarısız.', 'error');
    } catch { showToast('Bağlantı hatası.', 'error'); }
    finally { setIsAnalyzing(false); }
  };

  const handleDirectReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !directText) return;
    try {
      const res = await fetch('/api/students/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentName: `${selectedStudent.name} ${selectedStudent.surname}`,
          className: selectedStudent.class,
          parentEmail: selectedStudent.parent_email || '',
          content: directText,
          category: directCategory,
          notifyParent,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (notifyParent && selectedStudent.parent_email) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: `${selectedStudent.name} ${selectedStudent.surname}`,
            parentEmail: selectedStudent.parent_email,
            reportContent: directText,
            category: directCategory,
          }),
        });
      }

      setDirectText('');
      fetchReports(selectedStudent.id);
      showToast('Rapor başarıyla eklendi.');
    } catch (e) {
      console.error(e);
      showToast('Hata: ' + e.message, 'error');
    }
  };

  // ─── Save AI Report ────────────────────────────────────────────────────────
  const handleSaveAiReport = async () => {
    if (!aiMatch?.matchedStudentId) return;
    try {
      const student = students.find(s => s.id === aiMatch.matchedStudentId);
      const res = await fetch('/api/students/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: aiMatch.matchedStudentId,
          studentName: student ? `${student.name} ${student.surname}` : '',
          className: student?.class || '',
          parentEmail: student?.parent_email || '',
          content: aiMatch.extractedText,
          category: aiMatch.category || 'Diğer',
          notifyParent,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (notifyParent && student?.parent_email) {
        await fetch('/api/notify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentEmail: student.parent_email,
            studentName: `${student.name} ${student.surname}`,
            reportText: aiMatch.extractedText,
            category: aiMatch.category,
          }),
        });
      }

      setAiMatch(null); setVoiceText(''); setTextInput(''); setNotifyParent(false);
      showToast('Rapor başarıyla kaydedildi!');
      if (selectedStudent?.id === aiMatch.matchedStudentId) fetchReports(selectedStudent.id);
    } catch (e) { showToast('Kayıt hatası: ' + e.message, 'error'); }
  };

  // ─── Add Single Student ────────────────────────────────────────────────────
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newName || !newSurname || !newClass) return;
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName, surname: newSurname, studentClass: newClass,
          parentEmail: newParentEmail || '',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setNewName(''); setNewSurname(''); setNewClass(''); setNewParentEmail('');
      setShowAddStudent(false);
      fetchStudents();
      showToast('Öğrenci eklendi!');
    } catch (e) { showToast('Hata: ' + e.message, 'error'); }
  };

  // ─── CSV Import ────────────────────────────────────────────────────────────
  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(''); setCsvLoading(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(l => l.trim());
      const rows = lines.map(l => l.split(',').map(s => s.trim()));

      let imported = 0;
      for (const row of rows) {
        if (row.length < 3) continue;
        const [name, surname, cls, parentEmail = ''] = row;
        if (!name || !surname || !cls) continue;
        await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, surname, studentClass: cls, parentEmail,
          }),
        });
        imported++;
      }
      fetchStudents();
      showToast(`${imported} öğrenci başarıyla içe aktarıldı!`);
      setShowCSV(false);
    } catch (err) {
      setCsvError('CSV okunamadı: ' + err.message);
    } finally {
      setCsvLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Save Program Report ───────────────────────────────────────────────────
  const handleSaveProgramReport = async (e) => {
    e.preventDefault();
    if (!progName.trim()) return;

    const targetStudents = students.filter(s => progClass === 'All' || s.class === progClass);
    if (targetStudents.length === 0) {
      showToast('Seçilen sınıfta öğrenci bulunamadı.', 'error');
      return;
    }

    try {
      let savedCount = 0;
      for (const student of targetStudents) {
        await fetch('/api/students/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            studentName: `${student.name} ${student.surname}`,
            className: student.class,
            parentEmail: student.parent_email || '',
            content: `${progName} Programı - Durum: ${progStatus}.${progNotes ? ' Not: ' + progNotes : ''}`,
            category: 'Program',
            notifyParent: false,
          }),
        });
        savedCount++;
      }
      setShowProgramModal(false);
      setProgName(''); setProgNotes('');
      if (selectedStudent) fetchReports(selectedStudent.id);
      showToast(`${savedCount} öğrenci için program raporu eklendi!`);
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  // ─── Computed ──────────────────────────────────────────────────────────────
  const classesList = ['All', ...Array.from(new Set(students.map(s => s.class))).sort()];
  const filteredStudents = students.filter(s => {
    const name = `${s.name} ${s.surname}`.toLowerCase();
    return (
      (name.includes(searchQuery.toLowerCase()) || s.class.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedClass === 'All' || s.class === selectedClass)
    );
  });
  const getCategoryData = () => {
    const counts = {};
    reports.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return Object.keys(counts).map(cat => ({ name: cat, value: counts[cat] }));
  };

  // ─── Auth loading state ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 size={32} className="text-cyan-400 animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white relative">
      {/* Ambient glows */}
      <div className="fixed top-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-cyan-400/10 blur-[120px] pointer-events-none z-0" />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-3 border ${
              toast.type === 'error'
                ? 'bg-red-950 border-red-500/40 text-red-300'
                : 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-xl bg-cyan-400/10 border border-cyan-400/20">
                <ClipboardList size={22} className="text-cyan-400" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                Öğrenci Raporları
              </h1>
            </div>
            <p className="text-zinc-600 text-xs pl-14">
              Giriş: <span className="text-zinc-400">{user.email}</span>
              {role === 'admin' && (
                <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest">Yönetici</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Summary link */}
            <a
              href="/summary"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-400/25 hover:bg-purple-500 hover:text-white font-semibold transition-all text-sm"
            >
              <TrendingUp size={16} />
              Özet Rapor
            </a>
            {/* Admin panel */}
            {role === 'admin' && (
              <a
                href="/admin"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/25 hover:bg-amber-500 hover:text-black font-semibold transition-all text-sm"
              >
                <Shield size={16} />
                Yönetici
              </a>
            )}
            {/* Add student */}
            <button
              onClick={() => setShowAddStudent(!showAddStudent)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 hover:bg-cyan-400 hover:text-black font-semibold transition-all text-sm"
            >
              <Plus size={16} />
              Öğrenci Ekle
            </button>
            {/* Program button */}
            <button
              onClick={() => setShowProgramModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-400/25 hover:bg-cyan-500 hover:text-black font-semibold transition-all text-sm"
            >
              <ClipboardList size={16} />
              Program
            </button>
            {/* CSV import (admin only) */}
            {role === 'admin' && (
              <button
                onClick={() => setShowCSV(!showCSV)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-400/25 hover:bg-emerald-500 hover:text-black font-semibold transition-all text-sm"
              >
                <Upload size={16} />
                CSV Import
              </button>
            )}
            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-zinc-400 border border-white/10 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/25 font-semibold transition-all text-sm"
            >
              <LogOut size={16} />
              Çıkış
            </button>
          </div>
        </div>

        {/* ── Add Student Form ── */}
        <AnimatePresence>
          {showAddStudent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/8 p-6 rounded-2xl">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <User size={14} className="text-cyan-400" />
                  Sisteme Yeni Öğrenci Kaydet
                </h2>
                <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[
                    [newName, setNewName, 'Ad'],
                    [newSurname, setNewSurname, 'Soyad'],
                    [newClass, setNewClass, 'Sınıf (12-A)'],
                    [newParentEmail, setNewParentEmail, 'Veli E-posta (opsiyonel)'],
                  ].map(([val, setter, ph]) => (
                    <input key={ph} type="text" placeholder={ph} value={val}
                      onChange={e => setter(e.target.value)}
                      required={ph !== 'Veli E-posta (opsiyonel)'}
                      className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 text-sm"
                    />
                  ))}
                  <button type="submit"
                    className="bg-cyan-400 text-black font-bold rounded-xl py-3 hover:bg-cyan-300 transition-all text-sm"
                  >Kaydet</button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CSV Import ── */}
        <AnimatePresence>
          {showCSV && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-900/60 backdrop-blur-xl border border-emerald-500/20 p-6 rounded-2xl">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Upload size={14} className="text-emerald-400" />
                  CSV ile Toplu Öğrenci Ekle
                </h2>
                <p className="text-xs text-zinc-500 mb-4">
                  CSV formatı: <code className="bg-black/40 px-2 py-0.5 rounded text-zinc-300">Ad, Soyad, Sınıf, VeliEmail(opsiyonel)</code>
                </p>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleCSVImport}
                  className="block text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-500/15 file:text-emerald-400 file:font-semibold hover:file:bg-emerald-500 hover:file:text-black file:transition-all file:cursor-pointer"
                />
                {csvLoading && <p className="text-xs text-emerald-400 mt-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> İçe aktarılıyor...</p>}
                {csvError  && <p className="text-xs text-red-400 mt-3">{csvError}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Voice & AI Panel ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Voice console */}
          <div className="lg:col-span-3 bg-zinc-900/50 backdrop-blur-xl border border-white/8 p-8 rounded-3xl relative overflow-hidden flex flex-col">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-cyan-400/5 blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Sparkles size={18} className="text-purple-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Yapay Zekâ Sesli Rapor Girişi</h2>
              </div>
              <p className="text-zinc-600 text-xs mb-6 leading-relaxed">
                Mikrofona basın ve doğal dilde söyleyin.&nbsp;
                <span className="italic">"Furkan Karakoç bugün öğle yemeğine gelmedi, rapora gir."</span>
              </p>

              {/* Mic */}
              <div className="flex flex-col items-center py-6 gap-4">
                <div className="relative">
                  {isListening && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                      <span className="absolute inset-[-8px] rounded-full border border-red-500/20 animate-ping" style={{ animationDelay: '0.3s' }} />
                    </>
                  )}
                  <button
                    id="mic-button"
                    onClick={isListening ? stopListening : startListening}
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                      isListening
                        ? 'bg-red-500/20 border-red-400 text-red-400'
                        : 'bg-cyan-400/10 border-cyan-400/40 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]'
                    }`}
                  >
                    {isListening ? <MicOff size={30} /> : <Mic size={30} />}
                  </button>
                </div>
                <span className={`text-xs font-bold tracking-widest uppercase ${isListening ? 'text-red-400' : 'text-zinc-600'}`}>
                  {isListening ? 'Dinleniyor...' : 'Konuşmak için dokunun'}
                </span>
              </div>

              {/* Transcript */}
              <div className="mt-auto">
                <div className="text-[10px] uppercase tracking-widest text-zinc-700 mb-2 font-bold">Canlı Transcript</div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 min-h-[56px] text-zinc-300 text-sm leading-relaxed">
                  {voiceText || <span className="text-zinc-700 italic">Henüz kayıt yok...</span>}
                </div>
              </div>
            </div>
          </div>

          {/* AI Match */}
          <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-xl border border-white/8 p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                Yapay Zekâ Analiz Sonucu
              </h3>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-zinc-500 text-xs font-semibold">Gemini analiz yapıyor...</span>
                </div>
              ) : !aiMatch ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-700">
                  <AlertCircle size={32} className="mb-3 opacity-40" />
                  <p className="text-xs leading-relaxed">Sesli komut veya metin girildiğinde<br />analiz sonucu burada görüntülenir.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/3 border border-white/8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Eşleşen Öğrenci</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        aiMatch.matchedStudentId
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {aiMatch.matchedStudentId ? `%${Math.round(aiMatch.confidence * 100)} Güven` : 'Eşleşmedi'}
                      </span>
                    </div>
                    <div className="text-white font-bold flex items-center gap-2 text-sm">
                      <User size={14} className="text-cyan-400" />
                      {aiMatch.matchedStudentName || '—'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Kategori:</span>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full border"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[aiMatch.category] || '#6b7280'}18`,
                        borderColor: `${CATEGORY_COLORS[aiMatch.category] || '#6b7280'}40`,
                        color: CATEGORY_COLORS[aiMatch.category] || '#9ca3af',
                      }}>
                      {aiMatch.category}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest mb-1.5">Temizlenmiş Metin</div>
                    <p className="text-zinc-200 text-sm leading-relaxed">{aiMatch.extractedText}</p>
                  </div>

                  {/* Notify parent toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setNotifyParent(!notifyParent)}
                      className={`w-10 h-5 rounded-full border transition-all duration-300 relative ${
                        notifyParent ? 'bg-cyan-400 border-cyan-400' : 'bg-zinc-800 border-white/10'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${notifyParent ? 'left-5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-xs text-zinc-400 font-medium">Veli e-posta bildirimi gönder</span>
                  </label>
                </div>
              )}
            </div>

            {!isAnalyzing && aiMatch && (
              <div className="flex gap-3 mt-6">
                <button onClick={() => setAiMatch(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold flex items-center justify-center gap-2">
                  <X size={14} /> İptal
                </button>
                <button disabled={!aiMatch.matchedStudentId} onClick={handleSaveAiReport}
                  className="flex-[2] py-3 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.25)] disabled:opacity-40 disabled:cursor-not-allowed">
                  <Check size={14} /> Onayla ve Kaydet
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Text Input ── */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/8 p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Sparkles size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400" />
            <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) analyzeWithAI(textInput); }}
              placeholder="Yazılı rapor giriniz... (Enter veya butona basın)"
              className="w-full bg-black/30 border border-white/8 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-400/40 focus:ring-1 focus:ring-purple-400/20"
            />
          </div>
          <button onClick={() => { if (textInput.trim()) analyzeWithAI(textInput); }}
            className="px-5 py-3 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-400/25 hover:bg-purple-500 hover:text-white transition-all font-bold text-sm shrink-0">
            Çözümle
          </button>
        </div>

        {/* ── Student List ── */}
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <User size={20} className="text-cyan-400" />
              Öğrenci Listesi
              <span className="ml-1 text-xs font-bold bg-white/8 text-zinc-500 border border-white/10 px-2.5 py-1 rounded-full">
                {dataLoading ? '...' : filteredStudents.length}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-black/30 border border-white/8 rounded-xl p-1 overflow-x-auto max-w-xs">
                {classesList.map(cls => (
                  <button key={cls} onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      selectedClass === cls
                        ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                        : 'text-zinc-500 hover:text-zinc-200'
                    }`}>
                    {cls === 'All' ? 'Tümü' : cls}
                  </button>
                ))}
              </div>
              <div className="relative w-52">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input type="text" placeholder="Öğrenci ara..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/30 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400/40"
                />
              </div>
            </div>
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-cyan-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredStudents.map(student => (
                <motion.div key={student.id} whileHover={{ scale: 1.025, y: -2 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedStudent(student)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 relative overflow-hidden group flex flex-col justify-between h-44 ${
                    selectedStudent?.id === student.id
                      ? 'bg-white/8 border-cyan-400/40 shadow-[0_0_25px_rgba(34,211,238,0.1)]'
                      : 'bg-zinc-900/40 border-white/8 hover:border-white/15 hover:bg-white/5'
                  }`}
                >
                  <div className="absolute right-0 top-0 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400/5 to-purple-500/5 blur-xl group-hover:scale-150 transition-all" />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center font-extrabold text-sm text-white shadow-lg">
                      {student.name[0]}{student.surname[0]}
                    </div>
                    <span className="text-[10px] font-bold bg-white/5 px-2 py-1 rounded-full text-zinc-400 border border-white/8">{student.class}</span>
                  </div>
                  <div className="relative z-10">
                    <h3 className={`font-bold text-sm transition-colors ${selectedStudent?.id === student.id ? 'text-cyan-400' : 'text-white group-hover:text-cyan-400'}`}>
                      {student.name} {student.surname}
                    </h3>
                    {student.parent_email && (
                      <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{student.parent_email}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                        <FileText size={10} className="text-cyan-400" />
                        Profil &amp; Raporlar
                      </span>
                      <ChevronRight size={12} className="text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}

              {filteredStudents.length === 0 && !dataLoading && (
                <div className="col-span-full text-center py-16 text-zinc-700 border border-dashed border-white/8 rounded-2xl">
                  <User size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Öğrenci bulunamadı.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Student Profile Drawer ── */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-stretch justify-end"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 22, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl bg-zinc-950 border-l border-white/8 flex flex-col overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="p-5 sm:p-8 border-b border-white/8 flex items-center justify-between shrink-0 sticky top-0 bg-zinc-950 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center font-extrabold text-xl text-white shadow-lg">
                    {selectedStudent.name[0]}{selectedStudent.surname[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">{selectedStudent.name} {selectedStudent.surname}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 px-3 py-0.5 rounded-full uppercase tracking-widest">
                        {selectedStudent.class}
                      </span>
                      {selectedStudent.parent_email && (
                        <span className="text-[10px] text-zinc-500">{selectedStudent.parent_email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)}
                  className="p-2 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 sm:p-8 space-y-7 flex-1">
                {/* Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Pie */}
                  <div className="bg-zinc-900/50 border border-white/8 p-5 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
                      <BarChart2 size={12} className="text-purple-400" />
                      Kategori Dağılımı
                    </h4>
                    {getCategoryData().length > 0 ? (
                      <>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={getCategoryData()} cx="40%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value">
                                {getCategoryData().map((entry, i) => (
                                  <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} itemStyle={{ color: '#fff' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getCategoryData().map(d => (
                            <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[d.name] }} />
                              {d.name} ({d.value})
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-xs text-zinc-700">Veri yok.</div>
                    )}
                  </div>

                  {/* Quick report */}
                  <div className="bg-zinc-900/50 border border-white/8 p-5 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Hızlı Rapor Ekle</h4>
                    <form onSubmit={handleDirectReport} className="space-y-3">
                      <textarea rows={3} placeholder="Rapor içeriği..." value={directText}
                        onChange={e => setDirectText(e.target.value)} required
                        className="w-full bg-black/40 border border-white/8 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400/40 resize-none"
                      />
                      <div className="flex gap-2">
                        <select value={directCategory} onChange={e => setDirectCategory(e.target.value)}
                          className="bg-zinc-900 border border-white/8 text-xs text-zinc-300 rounded-lg px-2 py-2 focus:outline-none">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button type="submit"
                          className="flex-1 px-4 py-2 bg-cyan-400 text-black font-bold text-xs rounded-lg hover:bg-cyan-300 transition-all">
                          Ekle
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Report timeline */}
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                    <Clock size={16} className="text-cyan-400" />
                    Geçmiş Raporlar
                    <span className="text-xs font-bold bg-white/8 text-zinc-500 border border-white/10 px-2 py-0.5 rounded-full">{reports.length}</span>
                  </h3>
                  <div className="space-y-3">
                    {reports.length > 0 ? reports.map(report => {
                      const Icon = CATEGORY_ICONS[report.category] || FileText;
                      return (
                        <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-zinc-900/40 border border-white/8 flex items-start gap-4 hover:border-white/15 transition-colors">
                          <div className="p-2.5 rounded-lg border shrink-0"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[report.category] || '#6b7280'}12`,
                              borderColor: `${CATEGORY_COLORS[report.category] || '#6b7280'}30`,
                            }}>
                            <Icon size={16} style={{ color: CATEGORY_COLORS[report.category] || '#9ca3af' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-widest"
                                style={{ color: CATEGORY_COLORS[report.category] }}>
                                {report.category}
                              </span>
                              <span className="text-[10px] text-zinc-600">{tsToString(report.created_at)}</span>
                            </div>
                            <p className="text-zinc-200 text-sm mt-1.5 leading-relaxed">{report.report_text}</p>
                            <div className="text-[10px] text-zinc-600 mt-2">
                              Ekleyen: <span className="text-zinc-400">{report.created_by}</span>
                              {report.notify_parent && (
                                <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-[9px]">Veli bildirildi</span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="text-center py-12 text-zinc-700 border border-dashed border-white/8 rounded-2xl">
                        <FileText size={28} className="mx-auto mb-3 opacity-30" />
                        <p className="text-xs">Kayıtlı rapor yok.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Program Report Modal ── */}
      <AnimatePresence>
        {showProgramModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center px-4"
            onClick={() => setShowProgramModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-950 border border-cyan-400/25 rounded-3xl overflow-hidden shadow-2xl shadow-cyan-400/10"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/8 flex items-center justify-between bg-cyan-400/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-400/15 border border-cyan-400/25">
                    <ClipboardList size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">Program Raporu Ekle</h2>
                    <p className="text-zinc-500 text-xs mt-0.5">Tüm sınıf veya seçili sınıf için toplu rapor</p>
                  </div>
                </div>
                <button onClick={() => setShowProgramModal(false)}
                  className="p-2 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveProgramReport} className="p-6 space-y-4">
                {/* Program Name */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Program Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Yemek Programı, Spor Günü..."
                    value={progName}
                    onChange={e => setProgName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 text-sm"
                  />
                </div>

                {/* Class Filter */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Hangi Sınıf?</label>
                  <div className="flex flex-wrap gap-2">
                    {classesList.map(cls => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setProgClass(cls)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          progClass === cls
                            ? 'bg-cyan-400 text-black border-cyan-400'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/25'
                        }`}
                      >
                        {cls === 'All' ? 'Tüm Sınıflar' : cls}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Katılım Durumu</label>
                  <div className="flex gap-2">
                    {['Katıldı', 'Katılmadı', 'Geç Kaldı'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setProgStatus(s)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          progStatus === s
                            ? s === 'Katıldı'
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : s === 'Katılmadı'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'bg-amber-500 text-black border-amber-500'
                            : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/25'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Ek Not (Opsiyonel)</label>
                  <textarea
                    rows={2}
                    placeholder="Ek açıklama..."
                    value={progNotes}
                    onChange={e => setProgNotes(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400/50 text-sm resize-none"
                  />
                </div>

                {/* Info */}
                <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                  <ClipboardList size={12} className="text-cyan-400" />
                  {progClass === 'All'
                    ? `${students.length} öğrencinin tamamına rapor eklenecek.`
                    : `${students.filter(s => s.class === progClass).length} öğrenciye rapor eklenecek.`}
                </p>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowProgramModal(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold">
                    İptal
                  </button>
                  <button type="submit"
                    className="flex-[2] py-3 rounded-xl bg-cyan-500 text-black font-extrabold text-sm hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2">
                    <Check size={16} />
                    Kaydet
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
