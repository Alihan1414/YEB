'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Search, Plus, Check, X, FileText,
  User, Clock, Sparkles, ChevronRight, TrendingUp,
  GraduationCap, Utensils, AlertCircle,
  ClipboardList, BarChart2, LogOut, Shield, Upload,
  Loader2, Trash2, MessageCircle
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp } from 'firebase/firestore';

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
function formatPhoneForWa(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '90' + cleaned.slice(1);
  }
  if (cleaned.length === 10) {
    cleaned = '90' + cleaned;
  }
  return cleaned;
}

function tsToString(ts) {
  if (!ts) return '';
  if (typeof ts === 'string') return new Date(ts).toLocaleString('tr-TR');
  if (ts?.toDate) return ts.toDate().toLocaleString('tr-TR');
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString('tr-TR');
  return '';
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { user, role, institutionId, institutionName, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [students, setStudents]               = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reports, setReports]                 = useState([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedClass, setSelectedClass]     = useState('All');
  const [dataLoading, setDataLoading]         = useState(true);
  const [activeView, setActiveView]           = useState('students'); // 'students' | 'ai'

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
  const [newParentPhone, setNewParentPhone] = useState('');

  // CSV import
  const [showCSV, setShowCSV]     = useState(false);
  const [csvError, setCsvError]   = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const fileInputRef              = useRef(null);

  // Toast
  const [toast, setToast] = useState(null);
  const recognitionRef    = useRef(null);

  const [editingPhone, setEditingPhone]         = useState('');

  // Auth redirect
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (role === 'super_admin') {
        router.push('/admin');
      }
    }
  }, [user, role, authLoading, router]);

  useEffect(() => { if (user) fetchStudents(); }, [user]);
  useEffect(() => {
    if (selectedStudent) {
      fetchReports(selectedStudent.id);
      setEditingPhone(selectedStudent.parent_phone || '');
    }
  }, [selectedStudent]);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    setDataLoading(true);
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && apiData.students && apiData.students.length > 0) {
        setStudents(apiData.students);
        return;
      }
      
      const snap = await getDocs(collection(db, 'students'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      list.sort((a, b) => (a.surname || '').localeCompare(b.surname || '', 'tr'));
      setStudents(list);
    } catch (e) { console.error('fetchStudents error:', e); }
    finally { setDataLoading(false); }
  };

  const fetchReports = async (studentId) => {
    const instId = institutionId || 'yamanevler';
    try {
      const res = await fetch(`/api/students/reports?studentId=${studentId}&institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && apiData.reports) {
        setReports(apiData.reports);
        return;
      }
      const q = query(collection(db, 'reports'), where('student_id', '==', studentId));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      list.sort((a, b) => new Date(b.created_at?.toDate?.() || 0) - new Date(a.created_at?.toDate?.() || 0));
      setReports(list);
    } catch (e) { console.error('fetchReports error:', e); }
  };

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
        body: JSON.stringify({ text, institutionId: institutionId || 'yamanevler' }),
      });
      const data = await res.json();
      if (data.success) {
        setAiMatch(data.data);
      }
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
          className: selectedStudent.class || '',
          parentPhone: selectedStudent.parent_phone || '',
          content: directText,
          category: directCategory,
          notifyParent: !!notifyParent,
          institutionId: institutionId || 'yamanevler',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Rapor eklenemedi');

      if (notifyParent && selectedStudent.parent_phone) {
        const msg = `${institutionName || 'Yamanevler Enderun Bilişim'}'den merhaba. Öğrencimiz ${selectedStudent.name} ${selectedStudent.surname} için günlük rapor:\n\nKategori: ${directCategory}\nRapor: ${directText}`;
        const waUrl = `https://wa.me/${formatPhoneForWa(selectedStudent.parent_phone)}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');

        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: `${selectedStudent.name} ${selectedStudent.surname}`,
            parentPhone: selectedStudent.parent_phone,
            reportText: directText,
            category: directCategory,
          }),
        });
      }

      setDirectText('');
      await fetchReports(selectedStudent.id);
      await fetchStudents();
      showToast('Rapor başarıyla eklendi.');
    } catch (e) {
      console.error(e);
      showToast('Hata: ' + e.message, 'error');
    }
  };

  // ─── Save AI Report ────────────────────────────────────────────────────────
  const handleSaveAiReport = async () => {
    if (!aiMatch || !aiMatch.matchedStudentId) {
      showToast('Eşleşen öğrenci bulunamadı. Rapor kaydedilemez.', 'error');
      return;
    }
    const student = students.find(s => s.id === aiMatch.matchedStudentId);
    if (!student) {
      showToast('Öğrenci veritabanında bulunamadı.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/students/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          studentName: `${student.name} ${student.surname}`,
          className: student.class || '',
          parentPhone: student.parent_phone || '',
          content: aiMatch.extractedText,
          category: aiMatch.category || 'Diğer',
          notifyParent: !!notifyParent,
          institutionId: institutionId || 'yamanevler',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Rapor kaydı başarısız');

      if (notifyParent && student.parent_phone) {
        const msg = `${institutionName || 'Yamanevler Enderun Bilişim'}'den merhaba. Öğrencimiz ${student.name} ${student.surname} için günlük rapor:\n\nKategori: ${aiMatch.category}\nRapor: ${aiMatch.extractedText}`;
        const waUrl = `https://wa.me/${formatPhoneForWa(student.parent_phone)}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');

        await fetch('/api/notify', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentPhone: student.parent_phone,
            studentName: `${student.name} ${student.surname}`,
            reportText: aiMatch.extractedText,
            category: aiMatch.category,
          }),
        });
      }

      setAiMatch(null); setVoiceText(''); setTextInput(''); setNotifyParent(false);
      showToast('Rapor başarıyla kaydedildi!');
      await fetchStudents();
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
          name: newName,
          surname: newSurname,
          studentClass: newClass,
          parentPhone: newParentPhone || '',
          institutionId: institutionId || 'yamanevler',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ekleme başarısız');

      setNewName(''); setNewSurname(''); setNewClass(''); setNewParentPhone('');
      setShowAddStudent(false);
      await fetchStudents();
      showToast('Öğrenci başarıyla eklendi!');
    } catch (e) {
      console.error(e);
      try {
        await addDoc(collection(db, 'students'), {
          name: newName,
          surname: newSurname,
          class: newClass,
          parent_phone: newParentPhone || '',
          created_at: serverTimestamp(),
        });
        setNewName(''); setNewSurname(''); setNewClass(''); setNewParentPhone('');
        setShowAddStudent(false);
        await fetchStudents();
        showToast('Öğrenci başarıyla eklendi!');
      } catch (err) {
        showToast('Hata: ' + err.message, 'error');
      }
    }
  };

  // ─── Delete Student ────────────────────────────────────────────────────────
  const handleDeleteStudent = async (e, id, studentName) => {
    e.stopPropagation();
    if (!confirm(`${studentName} adlı öğrenciyi silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Silme başarısız');
      showToast('Öğrenci silindi');
      if (selectedStudent?.id === id) setSelectedStudent(null);
      await fetchStudents();
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    }
  };

  // ─── Delete Report ──────────────────────────────────────────────────────────
  const handleDeleteReport = async (reportId, studentId) => {
    if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/students/reports?id=${reportId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Silme başarısız');
      showToast('Rapor silindi');
      await fetchReports(studentId);
      await fetchStudents();
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    }
  };

  // ─── Send Report WhatsApp ───────────────────────────────────────────────────
  const handleSendReportWhatsApp = async (report) => {
    if (!report.parent_phone) {
      showToast('Velinin telefon numarası tanımlanmamış.', 'error');
      return;
    }
    try {
      const msg = `${institutionName || 'Kurum'}'den merhaba. Öğrencimiz ${selectedStudent.name} ${selectedStudent.surname} için günlük rapor:\n\nKategori: ${report.category}\nRapor: ${report.content}`;
      const waUrl = `https://wa.me/${formatPhoneForWa(report.parent_phone)}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
      
      await fetch('/api/students/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: report.id, notified: true }),
      });
      
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPhone: report.parent_phone,
          studentName: report.student_name,
          reportText: report.content,
          category: report.category,
        }),
      });

      showToast('WhatsApp yönlendirmesi açıldı.');
      await fetchReports(report.student_id);
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    }
  };

  // ─── Update Parent Phone ───────────────────────────────────────────────────
  const handleUpdateParentPhone = async (studentId, phone) => {
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, parentPhone: phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Güncelleme başarısız');
      showToast('Veli telefon numarası güncellendi.');
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, parent_phone: phone } : s));
      setSelectedStudent(prev => prev && prev.id === studentId ? { ...prev, parent_phone: phone } : prev);
      await fetchStudents();
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
    }
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
        const [name, surname, cls, parentPhone = ''] = row;
        if (!name || !surname || !cls) continue;
        await addDoc(collection(db, 'students'), {
          name, surname, class: cls, parent_phone: parentPhone,
          institution_id: institutionId || 'yamanevler',
          created_at: serverTimestamp(),
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
        <Loader2 size={32} className="text-[#06429c] animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const classesList = ['All', ...Array.from(new Set(students.map(s => s.class))).sort()];
  const filteredStudents = students.filter(s => {
    const name = `${s.name} ${s.surname}`.toLowerCase();
    return (
      (name.includes(searchQuery.toLowerCase()) || (s.class && s.class.toLowerCase().includes(searchQuery.toLowerCase()))) &&
      (selectedClass === 'All' || s.class === selectedClass)
    );
  });

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans selection:bg-blue-500 selection:text-white">
      {/* ── Desktop Left Sidebar (Visible on md+) ── */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#06429c] via-[#053787] to-[#011c4d] text-white flex-col justify-between p-6 shrink-0 shadow-2xl relative z-20">
        <div>
          {/* Logo Header */}
          <div className="flex flex-col items-center text-center space-y-3 pt-4 pb-8 border-b border-white/10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-lg shadow-black/20">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#06429c]" fill="currentColor">
                <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-black tracking-widest text-blue-200 uppercase">YAMANEVLER</h2>
              <h1 className="text-sm font-extrabold tracking-wider text-white">ENDERUN BİLİŞİM</h1>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 space-y-2">
            <button
              onClick={() => { setActiveView('students'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeView === 'students'
                  ? 'bg-blue-600/90 text-white shadow-md border border-blue-400/30'
                  : 'text-blue-100/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <User size={18} />
              Öğrenciler
            </button>
            
            <button
              onClick={() => { setActiveView('ai'); setSelectedStudent(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeView === 'ai'
                  ? 'bg-blue-600/90 text-white shadow-md border border-blue-400/30'
                  : 'text-blue-100/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles size={18} />
              Sesli AI Giriş
            </button>

            <a
              href="/summary"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all"
            >
              <TrendingUp size={18} />
              Özet Raporlar
            </a>
            {role === 'admin' && (
              <a
                href="/admin"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all"
              >
                <Shield size={18} />
                Ayarlar
              </a>
            )}
            {role === 'admin' && (
              <button
                onClick={() => setShowCSV(!showCSV)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all"
              >
                <Upload size={18} />
                CSV İçe Aktar
              </button>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-red-300 hover:bg-red-500/10 font-semibold text-sm transition-all"
            >
              <LogOut size={18} />
              Çıkış
            </button>
          </nav>
        </div>

        {/* Bottom Logo Branding */}
        <div className="pt-6 border-t border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center p-2 text-white">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
              <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
            </svg>
          </div>
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-white">{(institutionName || 'Yamanevler Enderun Bilişim').toUpperCase()}</div>
            <div className="text-blue-200 text-[10px]">Aktif Kurum</div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header (Visible on Mobile only) ── */}
      <header className="md:hidden bg-white px-5 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#06429c] rounded-xl flex items-center justify-center p-1.5 text-white">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
              <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-[9px] font-bold text-blue-900 leading-none">{institutionId?.toUpperCase() || 'YAMANEVLER'}</div>
            <div className="text-[11px] font-extrabold text-blue-800 leading-none">{institutionName || 'ENDERUN BİLİŞİM'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddStudent(!showAddStudent)} className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Plus size={18} />
          </button>
          <button onClick={logout} className="p-2 bg-red-50 text-red-600 rounded-xl">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-3 border ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Workspace Area ── */}
      <main className="flex-1 pb-24 md:pb-10 overflow-y-auto">
        
        {/* Top Header & Context Switch */}
        <div className="bg-white border-b border-slate-100 px-4 md:px-10 py-6">
          <div className="max-w-6xl mx-auto flex flex-col gap-4">
            
            {activeView === 'students' ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Öğrenciler Listesi</h1>
                    <p className="text-slate-500 text-xs mt-0.5">Toplam {filteredStudents.length} öğrenci listeleniyor.</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowAddStudent(!showAddStudent)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#06429c] text-white hover:bg-blue-700 font-bold text-xs shadow-md transition-all"
                    >
                      <Plus size={14} /> Öğrenci Ekle
                    </button>
                    {role === 'admin' && (
                      <button
                        onClick={() => setShowCSV(!showCSV)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 font-bold text-xs shadow-sm transition-all"
                      >
                        <Upload size={14} /> CSV Import
                      </button>
                    )}
                    <a
                      href="/summary"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-bold text-xs shadow-sm transition-all"
                    >
                      <TrendingUp size={14} /> Özet Raporlar
                    </a>
                  </div>
                </div>

                {/* Beautiful Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Öğrenci ismi veya sınıfı arayın (Örn: Alihan)..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-all font-medium"
                    />
                  </div>

                  <div className="relative min-w-[130px]">
                    <select
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs md:text-sm text-slate-700 font-semibold focus:outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer"
                    >
                      <option value="All">Tüm Sınıflar</option>
                      {classesList.filter(c => c !== 'All').map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <ChevronRight size={14} className="rotate-90" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // AI View Header
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Sparkles className="text-blue-600" size={24} /> Sesli Yapay Zekâ Girişi
                  </h1>
                  <p className="text-slate-500 text-xs mt-0.5">Doğal dilde konuşarak veya yazarak akıllı raporlar oluşturun.</p>
                </div>
                <button
                  onClick={() => setActiveView('students')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Öğrenci Listesine Dön
                </button>
              </div>
            )}

          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-10 mt-6 space-y-6">

          {activeView === 'students' ? (
            /* ──────────────── STUDENTS LIST VIEW ──────────────── */
            <>
              {/* Add Student Form */}
              <AnimatePresence>
                {showAddStudent && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-white border border-blue-200 p-6 rounded-3xl shadow-lg">
                      <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <User size={16} className="text-blue-600" /> Yeni Öğrenci Kaydı
                      </h2>
                      <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {[
                          [newName, setNewName, 'Ad'],
                          [newSurname, setNewSurname, 'Soyad'],
                          [newClass, setNewClass, 'Sınıf (Örn: 10-A)'],
                          [newParentPhone, setNewParentPhone, 'Veli Telefonu (05xx...)'],
                        ].map(([val, setter, ph]) => (
                          <input key={ph} type="text" placeholder={ph} value={val} onChange={e => setter(e.target.value)} required={ph !== 'Veli Telefonu (05xx...)'}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-medium"
                          />
                        ))}
                        <button type="submit" className="bg-[#06429c] text-white font-bold rounded-xl py-2.5 hover:bg-blue-700 transition-all text-xs shadow-md">Kaydet</button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CSV Import */}
              <AnimatePresence>
                {showCSV && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-white border border-blue-200 p-6 rounded-3xl shadow-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">CSV'den Öğrenci Aktarımı</h3>
                        <button onClick={() => setShowCSV(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                      </div>
                      <p className="text-slate-500 text-xs mb-3 leading-relaxed">
                        CSV formatı şu şekilde olmalıdır: <code>Ad, Soyad, Sınıf, VeliTelefonu</code> (başlık satırı olmadan).
                      </p>
                      <div className="flex items-center gap-3">
                        <input type="file" ref={fileInputRef} accept=".csv" onChange={handleCSVImport} disabled={csvLoading}
                          className="text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#06429c] hover:file:bg-blue-100 cursor-pointer"
                        />
                        {csvLoading && <Loader2 size={16} className="text-[#06429c] animate-spin" />}
                      </div>
                      {csvError && <p className="text-xs font-bold text-red-500 mt-2">{csvError}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Student Table */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                        <th className="pb-3 pl-2">Öğrenci Adı</th>
                        <th className="pb-3">Sınıf</th>
                        <th className="pb-3 hidden md:table-cell">Son Rapor</th>
                        <th className="pb-3">Durum</th>
                        <th className="pb-3 text-right pr-2">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {filteredStudents.map((st) => {
                        const initials = `${st.name ? st.name[0] : ''}${st.surname ? st.surname[0] : ''}`;
                        const status = st.status || 'Rapor Yok';
                        const statusStyle = status === 'İyi'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'Orta'
                            ? 'bg-amber-100 text-amber-700'
                            : status === 'Dikkat'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-500';

                        return (
                          <tr key={st.id} onClick={() => setSelectedStudent(st)} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                            <td className="py-3.5 pl-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#06429c] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                  {initials}
                                </div>
                                <span className="font-bold text-slate-800 group-hover:text-blue-700">{st.name} {st.surname}</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-semibold text-slate-600">{st.class || '10-A'}</td>
                            <td className="py-3.5 text-slate-400 hidden md:table-cell">{st.last_report_date ? tsToString(st.last_report_date) : 'Rapor Yok'}</td>
                            <td className="py-3.5">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusStyle}`}>
                                {status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right pr-2 text-slate-400">
                              <button
                                onClick={(e) => handleDeleteStudent(e, st.id, `${st.name} ${st.surname}`)}
                                title="Öğrenciyi Sil"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredStudents.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs font-semibold">Öğrenci bulunamadı.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ──────────────── AI WORKSPACE VIEW ──────────────── */
            <div className="space-y-6">
              
              {/* Dual voice & AI result cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Voice Input Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[340px]">
                  <div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Mic size={20} />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-extrabold text-slate-900">Yapay Zekâ Sesli Rapor Girişi</h3>
                        <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                          Mikrofona basın ve doğal dilde söyleyin,<br />
                          <span className="italic font-medium text-slate-600">"Furkan Karakoç bugün ödevini çok iyi yaptı, rapora gir."</span>
                        </p>
                      </div>
                    </div>

                    {/* Mic & Waveform animation */}
                    <div className="flex flex-col items-center justify-center my-6 py-2">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1 opacity-40">
                          <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse" />
                          <div className="w-1 h-7 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-10 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        </div>

                        <button
                          onClick={isListening ? stopListening : startListening}
                          className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${
                            isListening
                              ? 'bg-red-500 shadow-red-200 animate-pulse'
                              : 'bg-gradient-to-b from-[#1b63d6] to-[#043d96] shadow-blue-300 hover:scale-105'
                          }`}
                        >
                          {isListening ? <MicOff size={26} /> : <Mic size={26} />}
                        </button>

                        <div className="flex items-center gap-1 opacity-40">
                          <div className="w-1 h-10 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                          <div className="w-1 h-7 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse" />
                        </div>
                      </div>
                      <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 mt-4">
                        {isListening ? 'SİZİ DİNLİYORUZ...' : 'KONUŞMAK İÇİN DOKUNUN'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">CANLI TRANSCRIPT</div>
                    <div className="bg-[#f2f6fa] border border-slate-200/70 rounded-2xl p-3.5 min-h-[48px] text-xs text-slate-600">
                      {voiceText || <span className="text-slate-400 italic">Henüz ses kaydı yok...</span>}
                    </div>
                  </div>
                </div>

                {/* AI Analysis Result Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[340px]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="text-base md:text-lg font-extrabold text-slate-900 pt-1.5">Yapay Zekâ Analiz Sonucu</h3>
                  </div>

                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-10 my-auto">
                      <Loader2 size={36} className="text-blue-600 animate-spin" />
                      <span className="text-xs text-slate-500 mt-3 font-semibold">Gemini Analiz Ediyor...</span>
                    </div>
                  ) : !aiMatch ? (
                    <div className="flex flex-col items-center justify-center my-auto py-8 text-center">
                      <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-300 mb-3">
                        <Search size={30} />
                      </div>
                      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                        Sesli komut veya yazılı metin girdiğinizde<br />analiz sonucu ve eşleşen öğrenci burada gösterilir.
                      </p>
                    </div>
                  ) : (
                    <div className="my-auto space-y-3 py-4">
                      <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Eşleşen Öğrenci</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {aiMatch.matchedStudentName ? (
                            <span className="text-emerald-700">✓ {aiMatch.matchedStudentName}</span>
                          ) : (
                            <span className="text-red-500">⚠ Öğrenci Bulunamadı</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Temiz Rapor Metni</div>
                        <div className="text-xs text-slate-800 mt-0.5 leading-relaxed">{aiMatch.extractedText}</div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2">
                        <span className="font-bold text-slate-500">Kategori: <span className="text-blue-700">{aiMatch.category}</span></span>
                        
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-slate-500">
                            <input
                              type="checkbox"
                              checked={notifyParent}
                              onChange={e => setNotifyParent(e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            Veliye Bildir (WP)
                          </label>
                          <button
                            onClick={handleSaveAiReport}
                            disabled={!aiMatch.matchedStudentId}
                            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all ${
                              aiMatch.matchedStudentId
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div />
                </div>

              </div>

              {/* Written Rapor Text Entry Bar */}
              <div className="bg-white rounded-2xl p-2.5 md:p-3 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="pl-3 text-blue-600">
                  <Sparkles size={18} />
                </div>
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) analyzeWithAI(textInput); }}
                  placeholder="Yazılı rapor giriniz... (Örn: Alihan ödevlerini teslim etti)"
                  className="flex-1 bg-transparent border-none text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => { if (textInput.trim()) analyzeWithAI(textInput); }}
                  className="bg-[#06429c] text-white px-5 md:px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shrink-0 animate-none"
                >
                  <Sparkles size={14} /> Çözümle
                </button>
              </div>

            </div>
          )}

          {/* Footer Rights */}
          <div className="text-center text-xs text-slate-400 pt-4 pb-6">
            © 2025 {institutionName || 'Kurumsal Rapor Sistemi'}, Tüm hakları saklıdır.
          </div>

        </div>
      </main>

      {/* ── Student Details Sidebar Drawer (Cleaned of AI Input Box) ── */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="fixed inset-0 bg-black z-50 transition-opacity"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[500px] bg-white z-[51] shadow-2xl flex flex-col h-full border-l border-slate-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50/30 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-extrabold shadow-md">
                    {selectedStudent.name ? selectedStudent.name[0] : ''}{selectedStudent.surname ? selectedStudent.surname[0] : ''}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                      {selectedStudent.name} {selectedStudent.surname}
                    </h2>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-black uppercase tracking-wider">
                      Sınıf: {selectedStudent.class || '10-A'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedStudent(null); }}
                  className="p-2 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Veli İletişim Bilgisi (Veli Telefonu) */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VELİ İLETİŞİM BİLGİSİ</div>
                  
                  {selectedStudent.parent_phone ? (
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{selectedStudent.parent_phone}</span>
                        <button
                          onClick={() => {
                            const msg = `${institutionName || 'Kurum'}'den merhaba. Öğrencimiz ${selectedStudent.name} ${selectedStudent.surname} hakkında görüşmek üzere.`;
                            window.open(`https://wa.me/${formatPhoneForWa(selectedStudent.parent_phone)}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          title="WhatsApp'tan Mesaj Gönder"
                          className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg transition-all"
                        >
                          <MessageCircle size={15} />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          const newNum = prompt('Yeni telefon numarasını girin:', selectedStudent.parent_phone);
                          if (newNum !== null && newNum.trim() !== selectedStudent.parent_phone) {
                            handleUpdateParentPhone(selectedStudent.id, newNum.trim());
                          }
                        }}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        Düzenle
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                        <AlertCircle size={14} /> Veli telefon numarası tanımlanmamış!
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          placeholder="Veli telefon no. (05xx...)"
                          value={editingPhone}
                          onChange={e => setEditingPhone(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                        />
                        <button
                          onClick={() => {
                            if (editingPhone.trim()) {
                              handleUpdateParentPhone(selectedStudent.id, editingPhone.trim());
                            }
                          }}
                          className="bg-blue-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-700"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* mini analytics */}
                <div className="space-y-2.5">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KATEGORİ DAĞILIMI</div>
                  <div className="grid grid-cols-4 gap-2">
                    {['Akademik', 'Yemek', 'Program', 'Diğer'].map(cat => {
                      const count = reports.filter(r => r.category === cat).length;
                      return (
                        <div key={cat} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">{cat}</div>
                          <div className="text-base font-extrabold text-slate-800 mt-1">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hızlı Manuel Rapor Ekle */}
                <div className="bg-[#f8fafc] border border-slate-200/50 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">MANUEL HIZLI RAPOR EKLE</div>
                  <form onSubmit={handleDirectReportSubmit} className="space-y-3">
                    <textarea
                      value={directText}
                      onChange={e => setDirectText(e.target.value)}
                      placeholder="Rapor içeriği girin..."
                      className="w-full h-20 bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600 placeholder-slate-400"
                      required
                    />
                    <div className="flex items-center justify-between gap-3">
                      <select
                        value={directCategory}
                        onChange={e => setDirectCategory(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                      >
                        {['Akademik', 'Yemek', 'Program', 'Diğer'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-500">
                          <input
                            type="checkbox"
                            checked={notifyParent}
                            onChange={e => setNotifyParent(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Veliye Bildir (WP)
                        </label>
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md flex items-center gap-1"
                        >
                          <Plus size={14} /> Ekle
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Reports List */}
                <div className="space-y-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ÖĞRENCİYE AİT RAPORLAR ({reports.length})</div>
                  <div className="space-y-3 divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                    {reports.map((rep) => {
                      const IconComponent = CATEGORY_ICONS[rep.category] || FileText;
                      const iconColor = CATEGORY_COLORS[rep.category] || '#6b7280';

                      return (
                        <div key={rep.id} className="pt-3.5 first:pt-0 flex items-start justify-between gap-3 group/item">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-white mt-0.5"
                              style={{ backgroundColor: iconColor }}
                            >
                              <IconComponent size={14} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                {rep.content}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="font-semibold text-slate-500">{rep.category}</span>
                                <span>•</span>
                                <span>{tsToString(rep.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleSendReportWhatsApp(rep)}
                              title={rep.notified ? 'Veliye WhatsApp ile bildirim iletildi' : 'Veliye WhatsApp ile bildir'}
                              className={`p-1.5 rounded-lg border transition-all ${
                                rep.notified
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200'
                              }`}
                            >
                              <MessageCircle size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteReport(rep.id, selectedStudent.id)}
                              title="Raporu Sil"
                              className="p-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {reports.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs italic">
                        Bu öğrenci için henüz rapor girilmemiş.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation Bar (Visible on Mobile only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-2.5 px-2 z-40 shadow-lg">
        <button
          onClick={() => { setActiveView('students'); setSelectedStudent(null); }}
          className={`flex flex-col items-center gap-1 ${activeView === 'students' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <User size={18} />
          <span className="text-[10px] font-bold">Öğrenciler</span>
        </button>

        <button
          onClick={() => { setActiveView('ai'); setSelectedStudent(null); }}
          className={`flex flex-col items-center gap-1 ${activeView === 'ai' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Sparkles size={18} />
          <span className="text-[10px] font-bold">Sesli AI</span>
        </button>

        <a href="/summary" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600">
          <TrendingUp size={18} />
          <span className="text-[10px] font-medium">Özetler</span>
        </a>

        <a href="/admin" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600">
          <Shield size={18} />
          <span className="text-[10px] font-medium">Ayarlar</span>
        </a>
      </nav>
    </div>
  );
}
