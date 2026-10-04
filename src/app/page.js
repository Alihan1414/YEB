'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Mic, MicOff, Search, Plus, Check, X, FileText,
  User, Clock, Sparkles, ChevronRight, TrendingUp,
  GraduationCap, Utensils, AlertCircle, Heart, Sunrise,
  ClipboardList, BarChart2, LogOut, LogIn, Shield, Upload,
  Loader2, Trash2, MessageCircle, Trophy, Target, Tv, BookOpen, Calendar, Settings,
  Copy, RefreshCw, CheckSquare, UserCheck
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Sidebar, { MobileHeader, MobileBottomNav } from '@/components/Sidebar';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, where, serverTimestamp } from 'firebase/firestore';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Akademik: '#8b5cf6',
  Yoklama: '#f59e0b',
  Program: '#06b6d4',
  Sağlık: '#ef4444',
  'Girdi Çıktı': '#10b981',
  'Dahili Ders': '#a855f7',
  // Eski veri uyumluluğu
  Yemek: '#f59e0b',
  Namaz: '#10b981',
  Dahili: '#a855f7',
};
const CATEGORY_ICONS = {
  Akademik: GraduationCap,
  Yoklama: Utensils,
  Program: ClipboardList,
  Sağlık: Heart,
  'Girdi Çıktı': Clock,
  'Dahili Ders': BookOpen,
  // Eski veri uyumluluğu
  Yemek: Utensils,
  Namaz: Sunrise,
  Dahili: BookOpen,
};
const CATEGORIES = ['Akademik', 'Yoklama', 'Program', 'Sağlık', 'Girdi Çıktı', 'Dahili Ders'];

// Puan sistemi: olumlu rapor → kategori puanı, olumsuz rapor → -1
const CATEGORY_SCORES = {
  Akademik: 3,
  'Girdi Çıktı': 2,
  Program: 2,
  Sağlık: 1,
  Yoklama: 1,
  'Dahili Ders': 1,
  // Eski veri uyumluluğu
  Namaz: 2,
  Yemek: 1,
  Dahili: 1,
};

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

function formatSingleReportWaMessage({ institutionName, studentName, category, content, teacherName }) {
  const inst = institutionName || 'Bolu Kılıçarslan';
  const categoryIcons = {
    'Girdi Çıktı': '🚪',
    'Namaz': '🤲',
    'Akademik': '📚',
    'Program': '📋',
    'Sağlık': '🩺',
    'Yoklama': '📋',
    'Yemek': '🍽️',
    'Dahili Ders': '✨',
    'Dahili': '✨'
  };
  const icon = categoryIcons[category] || '📌';

  return `Kıymetli Velimiz, hayırlı günler dilerim. 🌿

${inst} olarak öğrencimiz ${studentName} hakkında bugünkü öğretmen değerlendirme notumuzu sizinle paylaşmak istedik:

${icon} ${category ? category + ' Takibi' : 'Günlük Not'}:
"${content}"

Öğrencimizin gayretini, ders ve kurum programına intizamını takdirle takip ediyoruz. Evdeki ilginiz, desteğiniz ve dualarınız için teşekkür ederiz.

Selam ve hürmetlerimizle,
${teacherName || inst}`;
}

function formatTeacherName(nameOrEmail) {
  if (!nameOrEmail) return 'Öğretmen';
  if (nameOrEmail === 'yeb@2026.com' || nameOrEmail === 'yeb@2026') return 'Yamanevler Admin';
  if (nameOrEmail === 'admin@yeb.local' || nameOrEmail === 'alihan@2026') return 'Sistem Yöneticisi';
  
  if (nameOrEmail.includes('@')) {
    const prefix = nameOrEmail.split('@')[0];
    const parts = prefix.split('.');
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
  return nameOrEmail;
}

function tsToString(ts) {
  if (!ts) return '';
  try {
    const d = ts?.toDate ? ts.toDate() : ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentsPage() {
  const { user, userName, role, institutionId, institutionName, logoUrl, primaryColor, enabledModules, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [students, setStudents]               = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reports, setReports]                 = useState([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [selectedClass, setSelectedClass]     = useState('All');
  const [dataLoading, setDataLoading]         = useState(true);
  const [activeView, setActiveView]           = useState('students'); // 'students' | 'ai'

  // URL ?view= sync for seamless navigation between pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'ai') {
        setActiveView('ai');
      } else if (v === 'students') {
        setActiveView('students');
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'ai') {
        setActiveView('ai');
      } else if (v === 'students') {
        setActiveView('students');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isListening, setIsListening]  = useState(false);
  const [voiceText, setVoiceText]      = useState('');
  const [isAnalyzing, setIsAnalyzing]  = useState(false);
  const [aiMatch, setAiMatch]          = useState(null);
  const [textInput, setTextInput]      = useState('');
  const [notifyParent, setNotifyParent] = useState(false);

  // Direct report form
  const [directText, setDirectText]         = useState('');
  const [directCategory, setDirectCategory] = useState('Akademik');
  const [directIsPositive, setDirectIsPositive] = useState(true);

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

  // Teacher Groups
  const [teacherGroups, setTeacherGroups] = useState([]);

  // Toast
  const [toast, setToast] = useState(null);
  const recognitionRef    = useRef(null);
  const lastSpokenRef     = useRef('');
  const lastAnalyzedRef   = useRef('');

  const [editingPhone, setEditingPhone] = useState('');

  // Haftalık istatistikler
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // İzin modülü aktif mi?
  const [leaveEnabled, setLeaveEnabled] = useState(false);

  // Veliye Durum Bildirme Raporu (Haftalık / Aylık AI Raporu)
  const [parentReportPeriod, setParentReportPeriod] = useState('haftalik'); // 'haftalik' | 'aylik' | 'genel'
  const [isGeneratingParentReport, setIsGeneratingParentReport] = useState(false);
  const [generatedParentReport, setGeneratedParentReport] = useState('');
  const [showParentReportBox, setShowParentReportBox] = useState(false);

  // Sync view from URL if navigating from other pages (e.g. /?view=ai or /?view=students)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'ai' || v === 'students') {
        setActiveView(v);
      }
    }
  }, []);

  // Auth redirect
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (role === 'cook') {
        router.push('/menu');
      }
    }
  }, [user, role, authLoading, router]);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    setDataLoading(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && Array.isArray(apiData.students)) {
        setStudents(apiData.students);
        return;
      }
    } catch (e) {
      console.error('fetchStudents API error:', e);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchTeacherGroups = async () => {
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/teacher-groups?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && Array.isArray(apiData.groups)) {
        setTeacherGroups(apiData.groups);
      }
    } catch (e) {
      console.warn('fetchTeacherGroups error:', e);
    }
  };

  const [selectedBulkStudents, setSelectedBulkStudents] = useState([]);
  const [isBulkSaving, setIsBulkSaving]                 = useState(false);

  const fetchReports = async (studentId) => {
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/students/reports?studentId=${studentId}&institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && Array.isArray(apiData.reports)) {
        setReports(apiData.reports);
        return;
      }
    } catch (e) { console.error('fetchReports error:', e); }
  };

  // ─── Weekly Stats ───────────────────────────────────────────────────────────
  const fetchWeeklyReports = async () => {
    setWeeklyLoading(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/students/reports?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const apiData = await res.json();
      if (apiData.success && apiData.reports) {
        const allReps = apiData.reports;
        // Son 7 günün raporlarını filtrele
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = allReps.filter(r => {
          const d = r.created_at ? new Date(r.created_at) : null;
          return d && d >= weekAgo;
        });
        setWeeklyReports(recent);

        // Map report stats to student list
        setStudents(prev => {
          if (!prev || prev.length === 0) return prev;
          const reportsBySid = {};
          allReps.forEach(r => {
            const sid = (r.student_id || r.studentId || '').trim();
            if (sid) {
              if (!reportsBySid[sid]) reportsBySid[sid] = [];
              reportsBySid[sid].push(r);
            }
          });

          return prev.map(st => {
            const stReps = reportsBySid[st.id] || [];
            if (stReps.length === 0) return st;
            stReps.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            const c = (stReps[0].content || '').toLowerCase();
            let stStatus = 'Orta';
            if (c.includes('gelmedi') || c.includes('kavga') || c.includes('hasta') || c.includes('dikkat') || c.includes('kutU') || c.includes('uyari') || c.includes('uyudu') || c.includes('kaynatti') || c.includes('inmedi')) {
              stStatus = 'Dikkat';
            } else if (c.includes('katildi') || c.includes('iyi') || c.includes('basarili') || c.includes('aktif') || c.includes('tebrik') || c.includes('tam')) {
              stStatus = 'İyi';
            }
            return {
              ...st,
              report_count: Math.max(st.report_count || 0, stReps.length),
              last_report_date: stReps[0].created_at || st.last_report_date,
              status: stStatus,
            };
          });
        });
      }
    } catch (e) { console.error('fetchWeeklyReports error:', e); }
    finally { setWeeklyLoading(false); }
  };

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        fetchStudents();
        fetchTeacherGroups();
        fetchWeeklyReports();
      });
      // İzin modülü ayarını çek
      const instId = institutionId || 'bolu-kilicaslan';
      fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (d.success && d.settings) setLeaveEnabled(!!d.settings.enabled); })
        .catch(() => {});
    }
  }, [user, institutionId]);

  useEffect(() => {
    if (selectedStudent) {
      Promise.resolve().then(() => {
        fetchReports(selectedStudent.id);
        setEditingPhone(selectedStudent.parent_phone || '');
        setGeneratedParentReport('');
        setShowParentReportBox(false);
      });
    }
  }, [selectedStudent]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Speech ────────────────────────────────────────────────────────────────
  const startListening = () => {
    const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SR) { 
      showToast('Tarayıcınız ses tanımayı desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.', 'error'); 
      return; 
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const rec = new SR();
      rec.lang = 'tr-TR';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      lastSpokenRef.current = '';
      lastAnalyzedRef.current = '';

      rec.onstart = () => {
        setIsListening(true);
        setVoiceText('');
        setAiMatch(null);
      };

      rec.onresult = (e) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            interimTranscript += e.results[i][0].transcript;
          }
        }
        const textSoFar = (finalTranscript || interimTranscript).trim();
        if (textSoFar) {
          setVoiceText(textSoFar);
          lastSpokenRef.current = textSoFar;
        }
        if (finalTranscript.trim()) {
          lastAnalyzedRef.current = finalTranscript.trim();
          analyzeWithAI(finalTranscript.trim());
        }
      };

      rec.onerror = (event) => {
        setIsListening(false);
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Mikrofon erişimi engellendi. Lütfen tarayıcı ayarlarından mikrofon izni verin.', 'error');
        } else if (event.error === 'no-speech') {
          // No speech detected
        } else if (event.error === 'network') {
          showToast('Ses tanıma için internet bağlantısı gerekiyor.', 'error');
        }
      };

      rec.onend = () => {
        setIsListening(false);
        const pending = (lastSpokenRef.current || '').trim();
        if (pending && pending !== lastAnalyzedRef.current) {
          lastAnalyzedRef.current = pending;
          analyzeWithAI(pending);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('startListening failed:', err);
      setIsListening(false);
      showToast('Mikrofon başlatılamadı.', 'error');
    }
  };

  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {}
    setIsListening(false);
  };

  // ─── AI Analysis ───────────────────────────────────────────────────────────
  const analyzeWithAI = async (text) => {
    if (!text || !text.trim()) return;
    setIsAnalyzing(true);
    try {
      // Öğrenci listesini doğrudan göndererek yapay zekanın tam eşleşmesini garantile
      const payloadStudents = students.map(s => ({
        id: s.id,
        fullName: `${s.name || ''} ${s.surname || ''}`.trim(),
        class: s.class || ''
      }));

      const res = await fetch('/api/students/ai', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          institutionId: institutionId || 'bolu-kilicaslan',
          students: payloadStudents,
          teacherGroups: teacherGroups
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiMatch(data.data);
        
        // Match all students from returned matchedStudents
        const matchedList = [];
        const rawMatches = Array.isArray(data.data.matchedStudents) ? [...data.data.matchedStudents] : [];
        if (data.data.matchedStudentId && !rawMatches.some(m => m.id === data.data.matchedStudentId)) {
          rawMatches.push({ id: data.data.matchedStudentId, name: data.data.matchedStudentName });
        }

        // If a group was identified, guarantee all group members from teacherGroups are included
        if (data.data.matchedGroupName) {
          const normTargetGrp = data.data.matchedGroupName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const grp = teacherGroups.find(g => {
            const normG = (g.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return normG === normTargetGrp || normG.includes(normTargetGrp) || normTargetGrp.includes(normG);
          });
          if (grp && Array.isArray(grp.student_ids)) {
            grp.student_ids.forEach(sId => {
              const st = students.find(s => s.id === sId);
              if (st && !matchedList.some(m => m.id === st.id)) {
                matchedList.push(st);
              }
            });
          }
        }

        // If a class was identified, guarantee all students in that class are included
        if (data.data.matchedClassName) {
          const normTargetCls = String(data.data.matchedClassName).toLowerCase().replace(/[^a-z0-9]/g, '');
          students.forEach(st => {
            if (st.class) {
              const normC = String(st.class).toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normC === normTargetCls || normC.includes(normTargetCls)) {
                if (!matchedList.some(m => m.id === st.id)) {
                  matchedList.push(st);
                }
              }
            }
          });
        }

        rawMatches.forEach(rm => {
          const normId = String(rm.id || '').trim().toLowerCase();
          const rawRmName = String(rm.name || '').trim().toLowerCase();
          const normName = rawRmName.replace(/[^a-z0-9]/g, '');

          const st = students.find(s => normId && String(s.id).trim().toLowerCase() === normId)
                  || students.find(s => normId && String(s.id).trim().toLowerCase().includes(normId))
                  || students.find(s => {
                       const full = `${s.name || ''} ${s.surname || ''}`.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                       return normName && (full === normName || full.includes(normName) || normName.includes(full));
                     })
                  || students.find(s => {
                       const fn = String(s.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                       const sn = String(s.surname || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                       return (fn && fn.length >= 3 && normName.includes(fn)) || (sn && sn.length >= 4 && normName.includes(sn));
                     });

          if (st && !matchedList.some(m => m.id === st.id)) {
            matchedList.push(st);
          }
        });

        setSelectedBulkStudents(matchedList);

        if (data.data.matchedGroupName) {
          showToast(`🎯 "${data.data.matchedGroupName}" grubu tespit edildi (${matchedList.length} öğrenci)!`);
        } else if (data.data.matchedClassName) {
          showToast(`🎯 "${data.data.matchedClassName}" sınıfı tespit edildi (${matchedList.length} öğrenci)!`);
        } else if (matchedList.length === 1) {
          showToast(`✅ ${matchedList[0].name} ${matchedList[0].surname} tespit edildi!`);
        } else if (matchedList.length > 1) {
          showToast(`✅ ${matchedList.length} öğrenci tespit edildi (Toplu Rapor)!`);
        } else {
          showToast('Eşleşen öğrenci veya grup metinde bulunamadı.', 'error');
        }
      }
      else showToast('Yapay zekâ analizi başarısız.', 'error');
    } catch (err) { 
      console.error(err);
      showToast('Bağlantı hatası.', 'error'); 
    }
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
          isPositive: directIsPositive,
          notifyParent: !!notifyParent,
          institutionId: institutionId || 'bolu-kilicaslan',
          createdBy: userName || user?.displayName || user?.name || user?.email || 'Öğretmen',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Rapor eklenemedi');

      if (notifyParent && selectedStudent.parent_phone) {
        const msg = formatSingleReportWaMessage({
          institutionName,
          studentName: `${selectedStudent.name} ${selectedStudent.surname}`,
          category: directCategory,
          content: directText,
          teacherName: userName || user?.displayName || user?.name || ''
        });
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
      if (data.report) {
        setReports(prev => [data.report, ...prev.filter(r => r.id !== data.report.id)]);
      }
      await fetchReports(selectedStudent.id);
      await fetchStudents();
      await fetchWeeklyReports();
      showToast('Rapor başarıyla eklendi.');
    } catch (e) {
      console.error(e);
      showToast('Hata: ' + e.message, 'error');
    }
  };

  // ─── Save AI Report (Supports Single & Multi/Bulk Students) ──────────────────
  const handleSaveAiReport = async () => {
    if (!aiMatch || selectedBulkStudents.length === 0) {
      showToast('Eşleşen veya seçilen öğrenci bulunamadı. Rapor kaydedilemez.', 'error');
      return;
    }

    setIsBulkSaving(true);
    const targetStudents = [...selectedBulkStudents];
    const instId = institutionId || 'bolu-kilicaslan';
    const author = userName || user?.displayName || user?.name || user?.email || 'Öğretmen';
    let savedCount = 0;

    try {
      for (const st of targetStudents) {
        const res = await fetch('/api/students/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: st.id,
            studentName: `${st.name} ${st.surname}`,
            className: st.class || '',
            parentPhone: st.parent_phone || '',
            content: aiMatch.extractedText,
            category: aiMatch.category || 'Dahili',
            isPositive: aiMatch.isPositive !== false,
            notifyParent: !!notifyParent,
            institutionId: instId,
            createdBy: author,
          }),
        });
        const data = await res.json();
        if (data.success) {
          savedCount++;
          if (data.report) {
            setReports(prev => [data.report, ...prev.filter(r => r.id !== data.report.id)]);
          }
        }
      }

      showToast(`${savedCount} öğrenci için rapor başarıyla kaydedildi!`);
      setAiMatch(null);
      setSelectedBulkStudents([]);
      setVoiceText('');
      setTextInput('');
      setNotifyParent(false);

      if (targetStudents.length === 1) {
        setSelectedStudent(targetStudents[0]);
        await fetchReports(targetStudents[0].id);
      }
      await fetchStudents();
      await fetchWeeklyReports();
    } catch (e) {
      showToast('Kayıt hatası: ' + e.message, 'error');
    } finally {
      setIsBulkSaving(false);
    }
  };

  // ─── Add Single Student ────────────────────────────────────────────────────
  const handleAddStudent = async (e) => {
    if (e) e.preventDefault();
    if (!newName.trim() || !newSurname.trim() || !newClass.trim()) {
      showToast('Lütfen Ad, Soyad ve Sınıf alanlarını doldurun.', 'error');
      return;
    }

    const currentInstId = institutionId || 'bolu-kilicaslan';
    const tempId = `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const addedStudent = {
      id: tempId,
      name: newName.trim(),
      surname: newSurname.trim(),
      class: newClass.trim(),
      parent_phone: newParentPhone ? newParentPhone.trim() : '',
      institution_id: currentInstId,
      status: 'Rapor Yok',
      last_report_date: null
    };

    // 1. Anında UI'a ekle (Hemen görünür)
    setStudents(prev => [addedStudent, ...prev]);
    showToast(`${addedStudent.name} ${addedStudent.surname} eklendi!`);

    const savedName = newName.trim();
    const savedSurname = newSurname.trim();
    const savedClass = newClass.trim();
    const savedPhone = newParentPhone.trim();

    setNewName('');
    setNewSurname('');
    setNewParentPhone('');
    // Sınıfı temizlemiyoruz: Aynı sınıfa arka arkaya seri öğrenci eklemek çok kolay olsun

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: savedName,
          surname: savedSurname,
          studentClass: savedClass,
          parentPhone: savedPhone,
          institutionId: currentInstId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Ekleme başarısız');

      if (data.student && data.student.id) {
        // Gerçek ID ile güncelle
        setStudents(prev => prev.map(s => s.id === tempId ? { ...data.student } : s));
      }
    } catch (e) {
      console.error('handleAddStudent error:', e);
      showToast('Hata: ' + e.message, 'error');
      setStudents(prev => prev.filter(s => s.id !== tempId));
    }
  };

  // ─── Delete Student ────────────────────────────────────────────────────────
  const handleDeleteStudent = async (e, id, studentName) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!confirm(`${studentName || 'Bu'} adlı öğrenciyi ve tüm raporlarını kalıcı olarak silmek istediğinize emin misiniz?`)) return;

    // Anında UI'dan kaldır (0 ms gecikme)
    if (selectedStudent?.id === id) setSelectedStudent(null);
    setStudents(prev => prev.filter(s => s.id !== id));
    showToast(`${studentName || 'Öğrenci'} başarıyla silindi.`);

    try {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Silme başarısız');
    } catch (err) {
      console.error('Silme hatası:', err);
      showToast('Silme hatası: ' + err.message, 'error');
      await fetchStudents();
    }
  };

  // ─── Delete Report ──────────────────────────────────────────────────────────
  const handleDeleteReport = async (reportId, studentId) => {
    if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) return;
    try {
      // Optimistically remove from state immediately
      setReports(prev => prev.filter(r => r.id !== reportId));
      const res = await fetch(`/api/students/reports?id=${encodeURIComponent(reportId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Silme başarısız');
      showToast('Rapor başarıyla silindi.');
      if (studentId) await fetchReports(studentId);
      await fetchStudents();
      await fetchWeeklyReports();
    } catch (err) {
      showToast('Hata: ' + err.message, 'error');
      if (studentId) await fetchReports(studentId);
    }
  };

  // ─── Send Report WhatsApp ───────────────────────────────────────────────────
  const handleSendReportWhatsApp = async (report) => {
    if (!report.parent_phone) {
      showToast('Velinin telefon numarası tanımlanmamış.', 'error');
      return;
    }
    try {
      const msg = formatSingleReportWaMessage({
        institutionName,
        studentName: `${selectedStudent.name} ${selectedStudent.surname}`,
        category: report.category,
        content: report.content,
        teacherName: userName || user?.displayName || user?.name || ''
      });
      const waUrl = `https://wa.me/${formatPhoneForWa(report.parent_phone)}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
      
      await fetch('/api/students/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          student_name: `${selectedStudent.name} ${selectedStudent.surname}`,
          class_name: selectedStudent.class,
          content: `[WhatsApp İletildi] ${report.content}`,
          category: report.category,
          institutionId: institutionId || 'bolu-kilicaslan',
        }),
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

  // ─── Girdi Çıktı Takibi (Check-in / Check-out) ──────────────────────────────
  const handleToggleCheckout = async (studentToToggle) => {
    const target = studentToToggle || selectedStudent;
    if (!target) return;

    const isCurrentlyOut = !!target.checkout_time;

    if (!isCurrentlyOut) {
      // 1. ÇIKIŞ YAPILDI
      const now = new Date();
      const nowIso = now.toISOString();
      const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

      setSelectedStudent(prev => prev && prev.id === target.id ? { ...prev, checkout_time: nowIso } : prev);
      setStudents(prev => prev.map(s => s.id === target.id ? { ...s, checkout_time: nowIso } : s));

      try {
        await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: target.id, checkout_time: nowIso }),
        });
        showToast(`${target.name} ${target.surname} için Çıkış saati kaydedildi: ${timeStr} (${dateStr})`, 'success');
      } catch (err) {
        console.error('Checkout error:', err);
        showToast('Çıkış kaydı sırasında hata oluştu.', 'error');
      }
    } else {
      // 2. GİRİŞ YAPILDI (Geri Dönüş)
      const checkoutDate = new Date(target.checkout_time);
      const returnDate = new Date();

      // Gece 00:00'ı geçmiş mi kontrolü:
      const midnightAfterCheckout = new Date(checkoutDate);
      midnightAfterCheckout.setHours(24, 0, 0, 0); // Bir sonraki günün 00:00'ı
      const isPastMidnight = returnDate >= midnightAfterCheckout;

      setSelectedStudent(prev => prev && prev.id === target.id ? { ...prev, checkout_time: null } : prev);
      setStudents(prev => prev.map(s => s.id === target.id ? { ...s, checkout_time: null } : s));

      try {
        await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: target.id, checkout_time: '' }),
        });

        if (isPastMidnight) {
          // Saat 00:00'ı geçmiş -> Program kategorisinde -1 geç geldi raporu gir
          const checkoutStr = `${checkoutDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} (${checkoutDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })})`;
          const returnStr = `${returnDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} (${returnDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })})`;

          const repRes = await fetch('/api/students/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: target.id,
              studentName: `${target.name} ${target.surname}`,
              className: target.class || '',
              parentPhone: target.parent_phone || '',
              content: `Kuruma geç geldi (Çıkış: ${checkoutStr} - Giriş: ${returnStr})`,
              category: 'Girdi Çıktı',
              isPositive: false, // -1 ceza puanı
              institutionId: institutionId || 'bolu-kilicaslan',
              createdBy: userName || 'Sistem'
            }),
          });
          const repData = await repRes.json();
          if (repData.success) {
            await fetchReports(target.id);
            await fetchWeeklyReports();
          }
          showToast(`Saat 00:00'ı geçtiği için ${target.name} adına Girdi Çıktı kategorisine -1 ceza puanı (Geç Geldi) işlendi!`, 'warning');
        } else {
          const returnTimeStr = returnDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          showToast(`${target.name} ${target.surname} giriş yaptı (${returnTimeStr}).`, 'success');
        }
      } catch (err) {
        console.error('Checkin error:', err);
        showToast('Giriş kaydı sırasında hata oluştu.', 'error');
      }
    }
  };

  // ─── Veli Durum Bildirme Raporu Oluştur (Haftalık / Aylık AI) ──────────────
  const handleGenerateParentReport = async (overridePeriod) => {
    if (!selectedStudent) return;
    const periodToUse = overridePeriod || parentReportPeriod;
    setIsGeneratingParentReport(true);
    setShowParentReportBox(true);

    try {
      // Seçilen döneme göre öğrencinin raporlarını filtrele
      const now = new Date();
      const filteredForPeriod = (reports || []).filter(r => {
        if (!r.created_at) return true;
        const rDate = new Date(r.created_at);
        if (periodToUse === 'haftalik') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return rDate >= weekAgo;
        } else if (periodToUse === 'aylik') {
          const monthAgo = new Date();
          monthAgo.setDate(now.getDate() - 30);
          return rDate >= monthAgo;
        }
        return true;
      });

      const res = await fetch('/api/ai/parent-progress-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: `${selectedStudent.name} ${selectedStudent.surname}`,
          className: selectedStudent.class || '',
          institutionName: institutionName || 'Bolu Kılıçarslan',
          period: periodToUse,
          reports: filteredForPeriod,
          teacherName: userName || user?.displayName || user?.name || ''
        })
      });

      const data = await res.json();
      if (data.success && data.message) {
        setGeneratedParentReport(data.message);
        showToast('Veli durum raporu hazırlandı ✨');
      } else {
        throw new Error(data.error || 'Rapor oluşturulamadı.');
      }
    } catch (err) {
      console.error('Parent report generation error:', err);
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setIsGeneratingParentReport(false);
    }
  };

  const handleSendParentReportWhatsApp = () => {
    if (!selectedStudent?.parent_phone) {
      showToast('Lütfen önce veli telefon numarasını girin veya düzenleyin.', 'error');
      return;
    }
    if (!generatedParentReport) return;
    const waUrl = `https://wa.me/${formatPhoneForWa(selectedStudent.parent_phone)}?text=${encodeURIComponent(generatedParentReport)}`;
    window.open(waUrl, '_blank');
    showToast('WhatsApp açılıyor...');
  };

  const handleCopyParentReport = () => {
    if (!generatedParentReport) return;
    navigator.clipboard.writeText(generatedParentReport);
    showToast('Veli durum raporu panoya kopyalandı! 📋');
  };

  // ─── CSV / Excel Toplu İçe Aktarma ──────────────────────────────────────────
  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(''); setCsvLoading(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(l => l.trim());
      const rows = lines.map(l => l.split(',').map(s => s.trim()));

      const studentsToImport = [];
      for (const row of rows) {
        if (row.length < 3) continue;
        const [name, surname, cls, parentPhone = ''] = row;
        if (!name || !surname || !cls) continue;
        studentsToImport.push({
          name,
          surname,
          studentClass: cls,
          parentPhone
        });
      }

      if (studentsToImport.length === 0) {
        throw new Error('İçe aktarılacak geçerli öğrenci bulunamadı.');
      }

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: studentsToImport,
          institutionId: institutionId || 'bolu-kilicaslan'
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'İçe aktarma başarısız.');

      await fetchStudents();
      showToast(`${data.count || studentsToImport.length} öğrenci başarıyla içe aktarıldı!`);
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

  // ─── Haftanın Sınıfı: Puan bazlı hesaplama ───────────────────────────────
  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const classScores = {};
  weeklyReports.forEach(r => {
    const st = studentMap[r.student_id];
    const cls = st?.class || r.class_name || 'Bilinmiyor';
    const basePts = CATEGORY_SCORES[r.category] || 1;
    const pts = r.isPositive === false ? -1 : basePts;
    classScores[cls] = (classScores[cls] || 0) + pts;
  });
  const topClass = Object.entries(classScores).sort((a, b) => b[1] - a[1])[0];
  const weeklyNamazCount  = weeklyReports.filter(r => r.category === 'Namaz').length;
  const weeklyAkademikCount = weeklyReports.filter(r => r.category === 'Akademik').length;



  const sidebarColor = primaryColor || '#06429c';

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans selection:bg-blue-500 selection:text-white w-full max-w-full">
      {/* ── Desktop Left Sidebar (Visible on md+) ── */}
      <Sidebar activeView={activeView} onSelectView={(v) => { setActiveView(v); setSelectedStudent(null); if (typeof window !== 'undefined') window.history.replaceState(null, '', `/?view=${v}`); }} />

      {/* ── Mobile Top Header (Visible on Mobile only) ── */}
      <MobileHeader
        title="Talebe Takip"
        activeView={activeView}
        onSelectView={(v) => { setActiveView(v); setSelectedStudent(null); if (typeof window !== 'undefined') window.history.replaceState(null, '', `/?view=${v}`); }}
        rightAction={
          <button
            onClick={() => setShowAddStudent(!showAddStudent)}
            className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
            title="Öğrenci Ekle"
          >
            <Plus size={18} />
          </button>
        }
      />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[9999] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 sm:gap-3 border max-w-[90vw] ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            <span className="truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Workspace Area ── */}
      <main className="flex-1 md:h-screen pb-28 md:pb-10 overflow-y-auto overflow-x-hidden min-w-0">
        
        {/* Top Header & Context Switch */}
        <div className="bg-white border-b border-slate-100 px-3.5 sm:px-6 md:px-10 py-4 sm:py-6">
          <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:gap-4">
            
            {activeView === 'students' ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">Öğrenciler Listesi</h1>
                    <p className="text-slate-500 text-xs mt-0.5">Toplam {filteredStudents.length} öğrenci listeleniyor.</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowAddStudent(!showAddStudent)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06429c] text-white hover:bg-blue-700 font-bold text-xs shadow-md transition-all cursor-pointer"
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
                      href="/ayarlar"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-bold text-xs shadow-sm transition-all"
                    >
                      <Settings size={14} /> Ayarlar
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
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <User size={16} />
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-slate-800">Hızlı Öğrenci Kaydı</h2>
                            <p className="text-[11px] text-slate-400">Öğrenci bilgilerini girip Kaydet&apos;e basın, anında listeye eklenir.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddStudent(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <datalist id="availableClasses">
                        {classesList.filter(c => c !== 'All').map(cls => (
                          <option key={cls} value={cls} />
                        ))}
                      </datalist>

                      <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        <input
                          type="text"
                          placeholder="Öğrenci Adı *"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          required
                          autoFocus
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Soyadı *"
                          value={newSurname}
                          onChange={e => setNewSurname(e.target.value)}
                          required
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-medium"
                        />
                        <input
                          type="text"
                          list="availableClasses"
                          placeholder="Sınıf (Örn: 10-A) *"
                          value={newClass}
                          onChange={e => setNewClass(e.target.value)}
                          required
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-medium"
                        />
                        <input
                          type="tel"
                          placeholder="Veli Telefonu (05xx...)"
                          value={newParentPhone}
                          onChange={e => setNewParentPhone(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-medium"
                        />
                        <button
                          type="submit"
                          className="bg-[#06429c] text-white font-bold rounded-xl py-2.5 hover:bg-blue-700 transition-all text-xs shadow-md flex items-center justify-center gap-1.5"
                        >
                          <Plus size={15} /> Kaydet
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CSV Import */}
              <AnimatePresence>
                {showCSV && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-white border border-blue-200 p-6 rounded-3xl shadow-lg space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-extrabold text-slate-700 tracking-wider uppercase flex items-center gap-2">
                          <FileText size={16} className="text-blue-600" />
                          CSV&apos;den Öğrenci Aktarımı
                        </h3>
                        <button onClick={() => { setShowCSV(false); setCsvPreview([]); }} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed">
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
              <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-sm border border-slate-100 space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">

                <div className="w-full overflow-x-auto -mx-1 sm:mx-0">
                  <table className="w-full text-left border-collapse min-w-[340px] sm:min-w-[480px]">
                    <thead>
                      <tr className="text-[10.5px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                        <th className="pb-3 pl-2">Öğrenci Adı</th>
                        <th className="pb-3">Sınıf</th>
                        <th className="pb-3 hidden md:table-cell">Son Rapor</th>
                        <th className="pb-3">Durum</th>
                        <th className="pb-3 text-right pr-2">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {dataLoading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={idx} className="animate-pulse">
                            <td className="py-3.5 pl-2 flex items-center gap-2.5">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200" />
                              <div className="h-4 w-28 sm:w-32 bg-slate-200 rounded-md" />
                            </td>
                            <td className="py-3.5"><div className="h-4 w-10 sm:w-12 bg-slate-200 rounded-md" /></td>
                            <td className="py-3.5 hidden md:table-cell"><div className="h-4 w-24 bg-slate-200 rounded-md" /></td>
                            <td className="py-3.5"><div className="h-4 w-16 bg-slate-200 rounded-md" /></td>
                            <td className="py-3.5 text-right pr-2"><div className="h-7 w-16 sm:w-20 bg-slate-200 rounded-xl ml-auto" /></td>
                          </tr>
                        ))
                      ) : filteredStudents.map((st) => {
                        const initials = `${st.name ? st.name[0] : ''}${st.surname ? st.surname[0] : ''}`;
                        const repCount = st.report_count || 0;
                        const status = st.status || (repCount > 0 ? 'Orta' : 'Rapor Yok');
                        const statusStyle = status === 'İyi'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'Orta'
                            ? 'bg-blue-100 text-blue-700'
                            : status === 'Dikkat'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-500';

                        return (
                          <tr key={st.id} onClick={() => setSelectedStudent(st)} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                            <td className="py-3 sm:py-3.5 pl-2">
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#06429c] text-white flex items-center justify-center font-bold text-[11px] sm:text-xs shadow-2xs shrink-0">
                                  {initials}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                  <span className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-blue-700 truncate">{st.name} {st.surname}</span>
                                  {st.checkout_time && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8.5px] font-black bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                      ÇIKTI ({new Date(st.checkout_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 sm:py-3.5 font-semibold text-slate-600 text-xs">{st.class || '10-A'}</td>
                            <td className="py-3 sm:py-3.5 text-slate-500 font-medium hidden md:table-cell text-xs">
                              {st.last_report_date ? tsToString(st.last_report_date) : <span className="text-slate-400">Rapor Yok</span>}
                            </td>
                            <td className="py-3 sm:py-3.5">
                              {repCount > 0 ? (
                                <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-wide shrink-0 ${statusStyle}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  <span>{repCount} Rapor</span>
                                  {status !== 'Rapor Yok' && <span className="hidden sm:inline">({status})</span>}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-slate-100 text-slate-400 shrink-0">
                                  Rapor Yok
                                </span>
                              )}
                            </td>
                            <td className="py-3 sm:py-3.5 text-right pr-2 text-slate-400">
                              <button
                                onClick={(e) => handleDeleteStudent(e, st.id, `${st.name} ${st.surname}`)}
                                title="Öğrenciyi Sil"
                                className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                              >
                                <Trash2 size={15} />
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
                          <span className="italic font-medium text-slate-600">&ldquo;Furkan Karakoç bugün ödevini çok iyi yaptı, rapora gir.&rdquo;</span>
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
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                      <span>CANLI SES METNİ (Düzenlenebilir)</span>
                      {voiceText && (
                        <button
                          type="button"
                          onClick={() => analyzeWithAI(voiceText)}
                          disabled={isAnalyzing}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200 transition-all flex items-center gap-1"
                        >
                          <Sparkles size={11} /> Yeniden Analiz Et
                        </button>
                      )}
                    </div>
                    <textarea
                      value={voiceText}
                      onChange={e => {
                        const newText = e.target.value;
                        setVoiceText(newText);
                        // Trigger AI re-analysis automatically if text has meaningful content (> 3 chars)
                        if (newText.trim().length >= 3) {
                          clearTimeout(window._transcriptTimer);
                          window._transcriptTimer = setTimeout(() => {
                            analyzeWithAI(newText);
                          }, 800);
                        }
                      }}
                      placeholder="Henüz ses kaydı yok... Buraya metni yazabilir veya ses kaydını düzeltebilirsiniz."
                      rows={3}
                      className="w-full bg-[#f2f6fa] border border-slate-200/70 rounded-2xl p-3.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-medium resize-y"
                    />
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
                        Sesli komut veya yazılı metin girdiğinizde<br />analiz sonucu ve eşleşen öğrenciler burada gösterilir.
                      </p>
                    </div>
                  ) : (
                    <div className="my-auto space-y-3.5 py-3">
                      {/* Eşleşen Öğrenciler (Tekil veya Çoklu / Toplu Rapor) */}
                      <div className="bg-blue-50/70 border border-blue-100 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                            <User size={12} />
                            Eşleşen Öğrenciler ({selectedBulkStudents.length})
                          </span>
                          <span className="text-[10px] text-blue-600 font-semibold">
                            {selectedBulkStudents.length > 1 ? 'Toplu Rapor Girişi' : 'Tekil Rapor'}
                          </span>
                        </div>

                        {/* Student Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedBulkStudents.map(st => (
                            <span
                              key={st.id}
                              className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-900 px-2.5 py-1 rounded-xl text-xs font-bold shadow-xs"
                            >
                              <span>{st.name} {st.surname}</span>
                              <span className="text-[10px] text-blue-500 font-normal">({st.class || 'Sınıf Yok'})</span>
                              <button
                                type="button"
                                onClick={() => setSelectedBulkStudents(prev => prev.filter(s => s.id !== st.id))}
                                className="text-slate-400 hover:text-red-600 ml-0.5"
                                title="Listeden Çıkar"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}

                          {selectedBulkStudents.length === 0 && (
                            <span className="text-xs text-red-500 font-medium italic">
                              ⚠ Eşleşen öğrenci bulunamadı. Lütfen aşağıdan öğrenci ekleyin:
                            </span>
                          )}
                        </div>

                        {/* Add student quickly to batch dropdown */}
                        <div className="pt-1">
                          <select
                            onChange={e => {
                              const found = students.find(s => s.id === e.target.value);
                              if (found && !selectedBulkStudents.some(s => s.id === found.id)) {
                                setSelectedBulkStudents(prev => [...prev, found]);
                              }
                              e.target.value = '';
                            }}
                            defaultValue=""
                            className="bg-white border border-blue-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer w-full"
                          >
                            <option value="" disabled>+ Listeye Başka Öğrenci Ekle...</option>
                            {students
                              .filter(s => !selectedBulkStudents.some(b => b.id === s.id))
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} {s.surname} ({s.class})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* Temiz Rapor Metni */}
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rapor İçeriği (Düzenlenebilir)</div>
                        <input
                          type="text"
                          value={aiMatch.extractedText}
                          onChange={e => setAiMatch(prev => ({ ...prev, extractedText: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                        />
                      </div>

                      {/* Kategori ve Kaydet Butonu */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">Kategori:</span>
                          <select
                            value={aiMatch.category || 'Dahili'}
                            onChange={e => setAiMatch(prev => ({ ...prev, category: e.target.value }))}
                            className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-blue-800 outline-none"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center justify-end gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-600 select-none">
                            <input
                              type="checkbox"
                              checked={notifyParent}
                              onChange={e => setNotifyParent(e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            Veliye Bildir (WP)
                          </label>
                          <button
                            onClick={handleSaveAiReport}
                            disabled={selectedBulkStudents.length === 0 || isBulkSaving}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                              selectedBulkStudents.length > 0 && !isBulkSaving
                                ? 'bg-[#06429c] text-white hover:bg-blue-700'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isBulkSaving ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Kaydediliyor...
                              </>
                            ) : (
                              <>
                                <Check size={14} />
                                {selectedBulkStudents.length > 1
                                  ? `Seçili (${selectedBulkStudents.length}) Talebeye Kaydet`
                                  : 'Raporu Kaydet'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div />
                </div>

              </div>

              {/* Written Rapor Text Entry Bar */}
              <div className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <div className="pl-1 sm:pl-2 text-blue-600 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <input
                    type="text"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && textInput.trim()) analyzeWithAI(textInput); }}
                    placeholder="Yazılı rapor giriniz... (Örn: Alihan ödevlerini teslim etti)"
                    className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1"
                  />
                </div>
                <button
                  onClick={() => { if (textInput.trim()) analyzeWithAI(textInput); }}
                  className="bg-[#06429c] text-white px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shrink-0 cursor-pointer"
                >
                  <Sparkles size={14} /> Çözümle
                </button>
              </div>

            </div>
          )}

          {/* Footer Rights */}
          <div className="text-center text-xs text-slate-400 pt-4 pb-6">
            © 2026 {institutionName || 'Kurumsal Rapor Sistemi'}, Tüm hakları saklıdır.
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
              className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md md:w-[500px] bg-white z-[51] shadow-2xl flex flex-col h-full border-l border-slate-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50/30 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-xs sm:text-sm shadow-md shrink-0">
                    {selectedStudent.name ? selectedStudent.name[0] : ''}{selectedStudent.surname ? selectedStudent.surname[0] : ''}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                      {selectedStudent.name} {selectedStudent.surname}
                    </h2>
                    <span className="inline-block mt-0.5 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                      Sınıf: {selectedStudent.class || '10-A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleDeleteStudent(e, selectedStudent.id, `${selectedStudent.name} ${selectedStudent.surname}`)}
                    title="Öğrenciyi Sil"
                    className="p-1.5 sm:p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 size={17} />
                  </button>
                  <button
                    onClick={() => { setSelectedStudent(null); }}
                    className="p-1.5 sm:p-2 hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-28 md:pb-6">
                
                {/* Veli İletişim Bilgisi (Veli Telefonu) */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VELİ İLETİŞİM BİLGİSİ</div>
                  
                  {selectedStudent.parent_phone ? (
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">{selectedStudent.parent_phone}</span>
                        <button
                          onClick={() => {
                            const sender = userName || user?.displayName || user?.name || institutionName || 'Öğretmeni';
                            const inst = institutionName || 'Bolu Kılıçarslan';
                            const msg = `Kıymetli Velimiz, hayırlı günler dilerim. 🌿\n\n${inst} bünyesindeki öğrencimiz ${selectedStudent.name} ${selectedStudent.surname}'ın genel durumu, dersleri ve gelişimi hakkında görüşmek üzere size ulaşıyorum.\n\nMüsait olduğunuz bir vakitte mesajla dönüş yapabilir veya bizi arayabilirsiniz. İlginiz ve evdeki kıymetli desteğiniz için teşekkür ederiz.\n\nSelam ve hürmetlerimizle,\n${sender}`;
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

                {/* ─── Veli Durum Bildirme Raporu (Haftalık / Aylık AI Raporu) ─── */}
                <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-slate-50 border border-blue-200/80 rounded-2xl p-4.5 space-y-3.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 tracking-tight">Veli Durum Bildirme Raporu</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {reports.length > 0 ? (
                            <span className="text-[10px] text-emerald-700 bg-emerald-100/70 border border-emerald-200/80 px-2 py-0.5 rounded-md font-bold">
                              ✓ {reports.length} kayıtlı rapor analiz edilir
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-amber-100/70 border border-amber-200/80 px-2 py-0.5 rounded-md font-semibold">
                              Kayıtlı rapor yok (Genel durum özeti)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dönem Seçimi */}
                    <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-[10px] font-bold shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setParentReportPeriod('haftalik');
                          if (showParentReportBox) handleGenerateParentReport('haftalik');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          parentReportPeriod === 'haftalik'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Haftalık
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setParentReportPeriod('aylik');
                          if (showParentReportBox) handleGenerateParentReport('aylik');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          parentReportPeriod === 'aylik'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Aylık
                      </button>
                    </div>
                  </div>

                  {!showParentReportBox ? (
                    <button
                      type="button"
                      onClick={() => handleGenerateParentReport()}
                      disabled={isGeneratingParentReport}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      {isGeneratingParentReport ? 'Raporlar Analiz Ediliyor...' : `${parentReportPeriod === 'haftalik' ? 'Haftalık' : 'Aylık'} Veli Raporu Oluştur`}
                    </button>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      {isGeneratingParentReport ? (
                        <div className="py-7 flex flex-col items-center justify-center text-center space-y-2.5 bg-white/80 rounded-xl border border-blue-100">
                          <Loader2 size={24} className="animate-spin text-blue-600" />
                          <p className="text-xs font-bold text-slate-800">Öğrencinin son dönemi ve gidişatı analiz ediliyor...</p>
                          <p className="text-[10px] text-slate-500 max-w-xs">İnsan yazmış gibi doğal, samimi bir veli bilgilendirme mesajı oluşturuluyor.</p>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <textarea
                              value={generatedParentReport}
                              onChange={e => setGeneratedParentReport(e.target.value)}
                              rows={8}
                              placeholder="Veliye gönderilecek mesaj metni..."
                              className="w-full bg-white border border-blue-200 rounded-xl p-3 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 font-medium resize-y"
                            />
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={handleSendParentReportWhatsApp}
                              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <MessageCircle size={14} />
                              WhatsApp ile Gönder
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyParentReport}
                              className="py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                              title="Metni Kopyala"
                            >
                              <Copy size={13} />
                              Kopyala
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGenerateParentReport()}
                              className="py-2 px-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all flex items-center gap-1"
                              title="Yeniden Oluştur"
                            >
                              <RefreshCw size={13} />
                              <span className="text-[10px]">Yenile</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowParentReportBox(false)}
                              className="py-2 px-2.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 text-xs font-bold transition-all"
                              title="Kapat"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* mini analytics & Girdi Çıktı */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KATEGORİ DAĞILIMI</div>
                    <div className="text-[10px] font-semibold">
                      {selectedStudent.checkout_time ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Dışarıda
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kurumda
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => {
                      if (cat === 'Girdi Çıktı') {
                        const isOut = !!selectedStudent.checkout_time;
                        if (isOut) {
                          const coDate = new Date(selectedStudent.checkout_time);
                          const timeStr = coDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                          const dateStr = coDate.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });

                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleToggleCheckout(selectedStudent)}
                              className="bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border border-amber-600 rounded-xl p-2 text-center shadow-md transition-all transform active:scale-95 flex flex-col items-center justify-between min-h-[74px] group cursor-pointer"
                              title="Giriş yapmak için tıklayın (00:00'ı geçmişse -1 ceza puanı işlenir)"
                            >
                              <div className="text-[9px] font-black tracking-wider uppercase bg-black/20 px-1.5 py-0.5 rounded text-amber-100 flex items-center gap-1">
                                <LogOut size={10} /> ÇIKTI ({dateStr})
                              </div>
                              <div className="text-sm font-black tracking-tight">{timeStr}</div>
                              <div className="text-[8px] font-bold text-amber-100 group-hover:underline">GİRİŞ İÇİN DOKUN</div>
                            </button>
                          );
                        }

                        // When IN:
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleToggleCheckout(selectedStudent)}
                            className="bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/90 rounded-xl p-2 text-center transition-all transform active:scale-95 flex flex-col items-center justify-between min-h-[74px] group cursor-pointer"
                            title="Çıkış vermek için dokunun"
                          >
                            <div className="text-[9px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                              <Clock size={10} /> GİRDİ ÇIKTI
                            </div>
                            <div className="text-xs font-black text-emerald-600 group-hover:text-emerald-700">İçeride</div>
                            <div className="text-[8px] font-extrabold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded group-hover:bg-emerald-200">
                              ÇIKIŞ VER
                            </div>
                          </button>
                        );
                      }

                      const count = reports.filter(r => {
                        if (cat === 'Yoklama') return r.category === 'Yoklama' || r.category === 'Yemek';
                        if (cat === 'Dahili Ders') return r.category === 'Dahili Ders' || r.category === 'Dahili';
                        return r.category === cat;
                      }).length;
                      const color = CATEGORY_COLORS[cat] || '#6b7280';

                      return (
                        <div key={cat} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center flex flex-col justify-between min-h-[74px]">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">{cat}</div>
                          <div className="text-base font-extrabold my-auto" style={{ color }}>{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Öğrenci Gelişim Grafiği */}
                {reports.length > 1 && (() => {
                  const dayCounts = {};
                  reports.forEach(r => {
                    const d = r.created_at ? new Date(r.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '?';
                    dayCounts[d] = (dayCounts[d] || 0) + 1;
                  });
                  const chartData = Object.entries(dayCounts).map(([day, count]) => ({ day, count })).reverse().slice(-7);
                  return (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📈 GELİŞİM GRAFİĞİ</div>
                      <div className="h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                            <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 9 }} width={20} />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#06429c" strokeWidth={2} dot={{ r: 3, fill: '#06429c' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}


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
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={directCategory}
                          onChange={e => setDirectCategory(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                        >
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setDirectIsPositive(p => !p)}
                          title={directIsPositive ? 'Olumlu rapor (puan kazandırır)' : 'Olumsuz rapor (-1 puan)'}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            directIsPositive
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {directIsPositive ? '👍 Olumlu' : '👎 Olumsuz'}
                        </button>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] sm:text-xs font-semibold text-slate-500 select-none">
                          <input
                            type="checkbox"
                            checked={notifyParent}
                            onChange={e => setNotifyParent(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          Veliye Bildir (WP)
                        </label>
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md flex items-center gap-1 cursor-pointer"
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
                  <div className="space-y-3 divide-y divide-slate-100 max-h-[480px] overflow-y-auto pr-1">
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
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                                <span className="font-semibold text-slate-500">{rep.category}</span>
                                <span
                                  className={`font-black text-[9px] px-1.5 py-0.5 rounded-full border ${
                                    rep.isPositive === false
                                      ? 'bg-red-50 border-red-200 text-red-600'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  }`}
                                >
                                  {rep.isPositive === false ? '-1' : `+${CATEGORY_SCORES[rep.category] || 1}`}
                                </span>
                                <span>•</span>
                                <span>{tsToString(rep.created_at)}</span>
                                {(rep.created_by || rep.createdBy) && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 font-bold bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200/80 inline-flex items-center gap-1">
                                      👤 {formatTeacherName(rep.created_by || rep.createdBy)}
                                    </span>
                                  </>
                                )}
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

                {/* Öğrenciyi Sil Butonu */}
                <div className="pt-4 pb-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteStudent(e, selectedStudent.id, `${selectedStudent.name} ${selectedStudent.surname}`)}
                    className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Trash2 size={15} /> Bu Öğrenciyi ve Tüm Raporlarını Sil
                  </button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation Bar (Visible on Mobile only) ── */}
      <MobileBottomNav activeView={activeView} onSelectView={(v) => { setActiveView(v); setSelectedStudent(null); if (typeof window !== 'undefined') window.history.replaceState(null, '', `/?view=${v}`); }} />
    </div>
  );
}
