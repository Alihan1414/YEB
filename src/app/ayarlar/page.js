'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, ToggleLeft, ToggleRight, Calendar, User, Trophy, Tv,
  LogOut, ShieldCheck, AlertCircle, Loader2, Copy, Check, Link2,
  Bell, BellOff, Target, Building2, ChevronRight, ExternalLink,
  Info, RefreshCw, Lock, Utensils, Music, UploadCloud, Trash2, Volume2,
  FileAudio, Play, CheckCircle2, Users, UserPlus, Sparkles, Plus, Edit2, Search, X
} from 'lucide-react';
import Sidebar, { MobileHeader, MobileBottomNav } from '@/components/Sidebar';
import Link from 'next/link';

export default function AyarlarPage() {
  const { user, userName, role, institutionId, institutionName, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // ── Leave Settings ──────────────────────────────────────────────────────────
  const [leaveSettings, setLeaveSettings] = useState({ enabled: false, assignedTeacherId: '' });
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [savingLeave, setSavingLeave] = useState(false);
  const [teachers, setTeachers] = useState([]);

  // ── Öğretmen Grupları Yönetimi ──────────────────────────────────────────────
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupFormName, setGroupFormName] = useState('');
  const [groupFormSelectedStudents, setGroupFormSelectedStudents] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupStudentSearch, setGroupStudentSearch] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  // ── General Settings ────────────────────────────────────────────────────────
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // ── Toast & Links ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Öğretmen Yönetimi ───────────────────────────────────────────────────────
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);

  // ── Aşçı Yönetimi ───────────────────────────────────────────────────────────
  const [cooks, setCooks] = useState([]);
  const [newCookName, setNewCookName] = useState('');
  const [newCookEmail, setNewCookEmail] = useState('');
  const [newCookPassword, setNewCookPassword] = useState('');
  const [addingCook, setAddingCook] = useState(false);

  // ── TV Ekranı Fon Sesi Yönetimi ─────────────────────────────────────────────
  const [tvAudio, setTvAudio] = useState(null);
  const [loadingTvAudio, setLoadingTvAudio] = useState(true);
  const [uploadingTvAudio, setUploadingTvAudio] = useState(false);
  const [deletingTvAudio, setDeletingTvAudio] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [audioCustomTitle, setAudioCustomTitle] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── TV Sesini Getir ──────────────────────────────────────────────────────────
  const fetchTvAudio = useCallback(async () => {
    setLoadingTvAudio(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/tv-audio?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setTvAudio(data.audio || null);
      }
    } catch (err) {
      console.error('fetchTvAudio error:', err);
    } finally {
      setLoadingTvAudio(false);
    }
  }, [institutionId]);

  // ── TV Sesini Yükle ──────────────────────────────────────────────────────────
  const handleUploadTvAudio = async (e) => {
    e.preventDefault();
    if (!selectedAudioFile) {
      showToast('Lütfen bir ses dosyası seçin (MP3, WAV, M4A vb.).', 'error');
      return;
    }
    if (selectedAudioFile.size > 50 * 1024 * 1024) {
      showToast('Ses dosyası boyutu maksimum 50MB olabilir.', 'error');
      return;
    }

    setUploadingTvAudio(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const formData = new FormData();
      formData.append('file', selectedAudioFile);
      formData.append('title', audioCustomTitle.trim() || selectedAudioFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('institutionId', instId);

      const res = await fetch('/api/tv-audio', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.audio) {
        setTvAudio(data.audio);
        setSelectedAudioFile(null);
        setAudioCustomTitle('');
        showToast('TV ekranı fon sesi başarıyla yüklendi! TV açıldığında çalacaktır.');
      } else {
        throw new Error(data.error || 'Ses yüklenemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingTvAudio(false);
    }
  };

  // ── TV Sesini Sil ────────────────────────────────────────────────────────────
  const handleDeleteTvAudio = async () => {
    if (!confirm('TV ekranına yüklenen özel sesi silmek istediğinize emin misiniz? TV ekranı varsayılan manevi ilahi/ney fon ezgisine dönecektir.')) return;
    setDeletingTvAudio(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/tv-audio?institutionId=${encodeURIComponent(instId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setTvAudio(null);
        showToast('Özel ses dosyası silindi. TV ekranı varsayılan fon sesine döndü.');
      } else {
        throw new Error(data.error || 'Ses silinemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingTvAudio(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherPassword) {
      showToast('Lütfen öğretmen adını ve şifresini girin.', 'error');
      return;
    }
    setAddingTeacher(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeacherName,
          email: newTeacherEmail || undefined,
          password: newTeacherPassword,
          institutionId: instId,
          institutionName: institutionName || 'Enderun Bilişim'
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Öğretmen hesabı başarıyla eklendi.');
        setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherPassword('');
        fetchTeachers();
      } else {
        throw new Error(data.error || 'Öğretmen eklenemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!confirm('Bu öğretmen hesabını silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/admin/teachers?id=${encodeURIComponent(teacherId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Öğretmen hesabı silindi.');
        fetchTeachers();
      } else {
        throw new Error(data.error || 'Silinemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── Fetch cooks ─────────────────────────────────────────────────────────────
  const fetchCooks = useCallback(async () => {
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/admin/cooks?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.cooks) setCooks(data.cooks);
    } catch (err) {
      console.error('fetchCooks error:', err);
    }
  }, [institutionId]);

  const handleAddCook = async (e) => {
    e.preventDefault();
    if (!newCookName || !newCookPassword) {
      showToast('Lütfen aşçı adını ve şifresini girin.', 'error');
      return;
    }
    setAddingCook(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch('/api/admin/cooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCookName,
          email: newCookEmail || undefined,
          password: newCookPassword,
          institutionId: instId,
          institutionName: institutionName || 'Enderun Bilişim'
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Aşçı hesabı başarıyla eklendi.');
        setNewCookName(''); setNewCookEmail(''); setNewCookPassword('');
        fetchCooks();
      } else {
        throw new Error(data.error || 'Aşçı eklenemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAddingCook(false);
    }
  };

  const handleDeleteCook = async (cookId) => {
    if (!confirm('Bu aşçı hesabını silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/admin/cooks?id=${encodeURIComponent(cookId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Aşçı hesabı silindi.');
        fetchCooks();
      } else {
        throw new Error(data.error || 'Silinemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  // ── Fetch Teacher Groups ───────────────────────────────────────────────────
  const fetchTeacherGroups = useCallback(async () => {
    setLoadingGroups(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/teacher-groups?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.groups) setTeacherGroups(data.groups);
    } catch (err) {
      console.error('fetchTeacherGroups error:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [institutionId]);

  // ── Fetch All Students for Group Selection ─────────────────────────────────
  const fetchAllStudents = useCallback(async () => {
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/students?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.students) setAllStudents(data.students);
    } catch (err) {
      console.error('fetchAllStudents error:', err);
    }
  }, [institutionId]);

  const handleOpenNewGroupModal = () => {
    setEditingGroupId(null);
    setGroupFormName('');
    setGroupFormSelectedStudents([]);
    setGroupStudentSearch('');
    setShowGroupModal(true);
  };

  const handleOpenEditGroupModal = (grp) => {
    setEditingGroupId(grp.id);
    setGroupFormName(grp.name);
    setGroupFormSelectedStudents(grp.student_ids || []);
    setGroupStudentSearch('');
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!groupFormName.trim()) {
      showToast('Lütfen grup adını giriniz (Örn: Aslanlar).', 'error');
      return;
    }
    if (groupFormSelectedStudents.length === 0) {
      showToast('Lütfen gruba en az 1 öğrenci seçiniz.', 'error');
      return;
    }

    setSavingGroup(true);
    const instId = institutionId || 'bolu-kilicaslan';
    const selectedNames = groupFormSelectedStudents.map(id => {
      const st = allStudents.find(s => s.id === id);
      return st ? `${st.name} ${st.surname}` : 'Öğrenci';
    });

    try {
      if (editingGroupId) {
        const res = await fetch('/api/teacher-groups', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingGroupId,
            name: groupFormName.trim(),
            studentIds: groupFormSelectedStudents,
            studentNames: selectedNames,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`"${groupFormName.trim()}" grubu başarıyla güncellendi.`);
          setShowGroupModal(false);
          fetchTeacherGroups();
        } else {
          throw new Error(data.error || 'Güncellenemedi.');
        }
      } else {
        const res = await fetch('/api/teacher-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: groupFormName.trim(),
            teacherEmail: user?.email || '',
            teacherName: user?.displayName || user?.name || userName || 'Öğretmen',
            teacherId: user?.uid || '',
            studentIds: groupFormSelectedStudents,
            studentNames: selectedNames,
            institutionId: instId,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`"${groupFormName.trim()}" grubu başarıyla oluşturuldu! 🎉`);
          setShowGroupModal(false);
          fetchTeacherGroups();
        } else {
          throw new Error(data.error || 'Grup oluşturulamadı.');
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (!confirm(`"${groupName}" grubunu silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/teacher-groups?id=${encodeURIComponent(groupId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Grup silindi.');
        fetchTeacherGroups();
      } else {
        throw new Error(data.error || 'Silinemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── Fetch leave settings ────────────────────────────────────────────────────
  const fetchLeaveSettings = useCallback(async () => {
    setLoadingLeave(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) setLeaveSettings(data.settings);
    } catch (err) {
      console.error('fetchLeaveSettings error:', err);
    } finally {
      setLoadingLeave(false);
    }
  }, [institutionId]);

  // ── Fetch teachers ──────────────────────────────────────────────────────────
  const fetchTeachers = useCallback(async () => {
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/admin/teachers?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.teachers) setTeachers(data.teachers);
    } catch (err) {
      console.error('fetchTeachers error:', err);
    }
  }, [institutionId]);

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        fetchLeaveSettings();
        fetchTvAudio();
        fetchTeacherGroups();
        fetchAllStudents();
        if (role === 'admin') {
          fetchTeachers();
          fetchCooks();
        }
      });
    }
  }, [user, role, fetchLeaveSettings, fetchTvAudio, fetchTeachers, fetchCooks, fetchTeacherGroups, fetchAllStudents]);

  // ── Save leave settings ─────────────────────────────────────────────────────
  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (role !== 'admin') return;
    setSavingLeave(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch('/api/admin/leave-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: instId, enabled: leaveSettings.enabled, assignedTeacherId: leaveSettings.assignedTeacherId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('İzin ayarları kaydedildi.');
        await fetchLeaveSettings();
        // Refresh the page so Sidebar re-fetches and immediately shows/hides the menu item
        router.refresh();
      } else throw new Error(data.error || 'Kayıt başarısız.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingLeave(false);
    }
  };

  // ── Save general settings (weeklyGoal, notifications) ──────────────────────
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setSavingGeneral(true);
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: instId,
          weeklyGoal,
          notificationsEnabled
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Genel ayarlar kaydedildi.');
      } else {
        throw new Error(data.error || 'Ayarlar kaydedilemedi.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingGeneral(false);
    }
  };

  // ── Load general settings ───────────────────────────────────────────────────
  const fetchGeneralSettings = useCallback(async () => {
    const instId = institutionId || 'bolu-kilicaslan';
    try {
      const res = await fetch(`/api/admin/settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && data.settings) {
        setWeeklyGoal(data.settings.weeklyGoal || 3);
        setNotificationsEnabled(!!data.settings.notificationsEnabled);
      }
    } catch (err) {
      console.error('fetchGeneralSettings error:', err);
    }
  }, [institutionId]);

  // Wrap in microtask to avoid setState-in-effect warning
  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => fetchGeneralSettings());
    }
  }, [user, fetchGeneralSettings]);

  // Remove duplicate

  // ── Copy link ───────────────────────────────────────────────────────────────
  const studentFormLink = typeof window !== 'undefined'
    ? `${window.location.origin}/izin/${institutionId || 'bolu-kilicaslan'}`
    : `/izin/${institutionId || 'bolu-kilicaslan'}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(studentFormLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      showToast('Link kopyalanamadı, tarayıcı izinlerini kontrol edin.', 'error');
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans w-full max-w-full">

      <Sidebar />
      <MobileHeader title="Ayarlar" />

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
            {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            <span className="truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <main className="flex-1 md:h-screen pb-28 md:pb-10 overflow-y-auto overflow-x-hidden min-w-0">
        {/* Page header */}
        <div className="bg-white border-b border-slate-100 px-3.5 sm:px-6 md:px-10 py-4 sm:py-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="text-blue-600" size={24} /> Ayarlar
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Kurum ayarlarını, TV ekranı fon sesini, izin modülünü ve personel hesaplarını buradan yönetebilirsiniz.
            </p>

            {/* Hızlı Kategori Atlama Butonları */}
            <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar pb-1">
              <a href="#tv-sesi" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-900 text-xs font-black transition-all shadow-xs shrink-0">
                <Music size={14} className="text-cyan-600" />
                TV Fon Sesi Yönetimi
              </a>
              <a href="#izin-linki" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold transition-all shrink-0">
                <Link2 size={13} className="text-blue-600" />
                İzin Başvuru Linki
              </a>
              <a href="#ogretmenler" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shrink-0">
                <User size={13} className="text-slate-500" />
                Öğretmenler
              </a>
              <a href="#ascilar" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-all shrink-0">
                <Utensils size={13} className="text-amber-600" />
                Aşçı Yönetimi
              </a>
              <a href="#genel-ayarlar" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-semibold transition-all shrink-0">
                <Target size={13} className="text-purple-600" />
                Genel Ayarlar
              </a>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.__hardRefreshApp) {
                    window.__hardRefreshApp();
                  } else {
                    window.location.reload();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black transition-all shadow-xs active:scale-95 sm:ml-auto shrink-0"
                title="Mobil veya masaüstü önbelleğini temizleyip en güncel sürümü anında yükler"
              >
                <RefreshCw size={13} className="text-emerald-600" />
                En Güncel Sürümü Yükle & Önbelleği Temizle
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-3.5 sm:px-6 md:px-10 py-6 sm:py-8 space-y-4 sm:space-y-6">

          {/* ── Section: Kurum Bilgisi (read-only) ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="text-slate-400" size={16} />
              <h2 className="font-extrabold text-slate-800 text-sm">Kurum Bilgisi</h2>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kurum Adı</p>
                <p className="font-extrabold text-slate-800 text-sm">{institutionName || '—'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kurum ID</p>
                <p className="font-extrabold text-slate-800 text-sm font-mono">{institutionId || '—'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rol</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                  role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  <ShieldCheck size={12} />
                  {role === 'admin' ? 'Yönetici' : 'Öğretmen'}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">E-posta</p>
                <p className="font-semibold text-slate-700 text-xs truncate">{user?.email || '—'}</p>
              </div>
            </div>
          </motion.section>

          {/* ── Section: Öğrenci İzin Başvuru Linki ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Link2 className="text-blue-500" size={16} />
              <h2 className="font-extrabold text-slate-800 text-sm">Öğrenci İzin Başvuru Linki</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-slate-500 text-xs leading-relaxed">
                Bu linki öğrencilere ve velilere gönderin. Linke giren kişi doğrudan izin talep formuna yönlendirilir ve form doldurulduktan sonra talep sisteme otomatik olarak işlenir.
              </p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Başvuru Formu Linki</p>
                  <p className="text-blue-800 font-bold text-xs font-mono truncate">{studentFormLink}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                      linkCopied
                        ? 'bg-emerald-500 text-white shadow-emerald-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                    }`}
                  >
                    {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                    {linkCopied ? 'Kopyalandı!' : 'Kopyala'}
                  </button>
                  <a
                    href={studentFormLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Önizle
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-2xl">
                <Info size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                <p className="text-[11px] leading-relaxed font-medium">
                  İzin sistemi tüm kurumlarda <strong>sürekli aktiftir</strong>. Veliler ve öğrenciler bu bağlantı üzerinden kesintisiz izin talebinde bulunabilir.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── Section: TV Ekranı Fon Sesi Yönetimi (Öne Çıkarılmış) ── */}
          <motion.section
            id="tv-sesi"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-3xl border-2 border-cyan-200/80 shadow-md overflow-hidden relative"
          >
            {/* Üst Vurgu Çizgisi */}
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-500" />

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                  <Music size={18} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    TV Ekranı Fon Sesi Yönetimi
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                      Yeni Özellik
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">TV panosunda çalacak müziği buradan yönetin</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/tv"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  title="TV ekranını yeni sekmede aç ve sesi canlı dinle"
                >
                  <Tv size={14} />
                  <span>TV Ekranını Aç</span>
                  <ExternalLink size={12} className="opacity-70" />
                </Link>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              <p className="text-slate-600 text-xs leading-relaxed">
                TV ekranı açıldığında arka planda otomatik ve kesintisiz çalacak özel bir ses dosyası (ilahi, kaside, ney taksimi, anons vb.) ekleyebilirsiniz. Yüklenen ses TV ekranında döngüsel (loop) olarak çalar ve dilediğiniz an buradan dinleyebilir veya silebilirsiniz.
              </p>

              {/* Mevcut Yüklü Ses Durumu */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 size={14} className="text-slate-600" />
                    Şu Anda TV'de Çalan Ses
                  </span>
                  {tvAudio ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Özel Ses Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Varsayılan Akustik Ses (İlahi / Ney)
                    </span>
                  )}
                </div>

                {loadingTvAudio ? (
                  <div className="py-6 flex items-center justify-center text-slate-400 text-xs gap-2">
                    <Loader2 size={16} className="animate-spin text-cyan-600" />
                    Ses ayarları yükleniyor...
                  </div>
                ) : tvAudio ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                          <FileAudio size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-sm truncate">
                            {tvAudio.title}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate font-mono">
                            {tvAudio.fileName} • {tvAudio.sizeBytes ? `${(tvAudio.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'Bilinmiyor'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleDeleteTvAudio}
                        disabled={deletingTvAudio}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                        title="Bu sesi sil ve varsayılana dön"
                      >
                        {deletingTvAudio ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Sesi Kaldır / Sil
                      </button>
                    </div>

                    {/* Ses Önizleme Oynatıcı */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                      <p className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <Play size={13} className="text-cyan-600" /> Ses Önizlemesi (Buradan Dinleyebilirsiniz):
                      </p>
                      <audio
                        controls
                        src={tvAudio.url}
                        className="w-full h-10 rounded-lg outline-none"
                        preload="metadata"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-500 text-xs leading-relaxed">
                    Henüz özel bir ses dosyası yüklenmedi. TV ekranında sistemin yerleşik dinlendirici <strong>Tasavvufi İlahi & Ney</strong> ezgisi çalmaktadır. Aşağıdaki bölümden kurumunuza özel bir ses dosyası ekleyebilirsiniz.
                  </div>
                )}
              </div>

              {/* Yeni Ses Yükleme Formu */}
              <form onSubmit={handleUploadTvAudio} className="border-t border-slate-100 pt-5 space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UploadCloud size={16} className="text-cyan-600" />
                  {tvAudio ? 'Sesi Güncelle / Yeni Ses Yükle' : 'TV Ekranına Ses Dosyası Ekle'}
                </h3>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Ses Başlığı / Açıklaması (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    value={audioCustomTitle}
                    onChange={(e) => setAudioCustomTitle(e.target.value)}
                    placeholder="Örn: Cuma Günü İlahi Dinletisi veya Huzur Veren Ney Taksimi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Ses Dosyası Seç (.mp3, .wav, .m4a, .aac, .ogg)
                  </label>
                  <div className="relative border-2 border-dashed border-cyan-200 hover:border-cyan-400 rounded-2xl p-5 text-center transition-all bg-cyan-50/20 hover:bg-cyan-50/40 cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedAudioFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
                        <UploadCloud size={20} />
                      </div>
                      {selectedAudioFile ? (
                        <div>
                          <p className="font-extrabold text-xs text-cyan-700">
                            ✓ Seçilen Dosya: {selectedAudioFile.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {(selectedAudioFile.size / (1024 * 1024)).toFixed(2)} MB • Değiştirmek için tekrar tıklayın
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            Ses dosyasını seçmek için buraya tıklayın veya sürükleyin
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Maksimum 50 MB (MP3, WAV, M4A formatları desteklenir)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-slate-400 font-medium">
                    {selectedAudioFile ? 'Dosya hazır, kaydetmek için butona basın.' : 'Dosya seçildikten sonra yükleme butonu aktifleşir.'}
                  </p>
                  <button
                    type="submit"
                    disabled={uploadingTvAudio || !selectedAudioFile}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {uploadingTvAudio ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Yükleniyor...
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        TV Ekranına Sesi Yükle
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.section>

          {/* ── Section: İzin Modülü Ayarları ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-500" size={16} />
                <h2 className="font-extrabold text-slate-800 text-sm">İzin Modülü</h2>
              </div>
              {!loadingLeave && (
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                  leaveSettings.enabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {leaveSettings.enabled ? '● AKTİF' : '○ KAPALI'}
                </span>
              )}
            </div>

            <div className="px-6 py-5">
              {role !== 'admin' ? (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl flex gap-3 text-xs">
                  <Lock size={16} className="shrink-0 text-amber-600" />
                  <div>
                    <span className="font-bold">Yetki Sınırı: </span>İzin ayarlarını yalnızca kurum yöneticileri değiştirebilir.
                  </div>
                </div>
              ) : loadingLeave ? (
                <div className="py-8 text-center">
                  <Loader2 size={24} className="text-blue-600 animate-spin mx-auto" />
                </div>
              ) : (
                <form onSubmit={handleSaveLeave} className="space-y-5">
                  {/* Status Banner (Always Active) */}
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200/80 p-4 rounded-2xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="font-extrabold text-sm text-emerald-950">İzin Sistemi Her Zaman Aktiftir</p>
                      </div>
                      <p className="text-[11px] text-emerald-700/80 font-medium mt-1">
                        İzin yönetimi bütün kurumlarda kalıcı olarak açıktır. Veliler her zaman izin talebinde bulunabilir.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 ml-3">
                      AÇIK
                    </span>
                  </div>

                  {/* Assigned Teacher */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block">İzinlerden Sorumlu Yetkili</label>
                    <select
                      value={leaveSettings.assignedTeacherId}
                      onChange={e => setLeaveSettings(s => ({ ...s, assignedTeacherId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-xs font-semibold"
                    >
                      <option value="">Seçilmedi (Tüm öğretmenler onaylayabilir)</option>
                      {teachers.map(t => (
                        <option key={t.id || t.email} value={t.id || t.email}>{t.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 font-medium mt-1.5 leading-normal">
                      İzin başvuru formunda velilere izinleri onaylayacak yetkili kişi olarak gösterilir.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingLeave}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingLeave ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    İzin Ayarlarını Kaydet
                  </button>
                </form>
              )}
            </div>
          </motion.section>

          {/* ── Section: Öğretmen Grupları Yönetimi (Tüm Öğretmenler ve Admin) ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.20 }}
            className="bg-white rounded-3xl border border-blue-200/80 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm md:text-base">Öğretmen Grupları Yönetimi (Talebe Grupları)</h2>
                  <p className="text-[11px] text-slate-500">
                    Özel talebe gruplarınızı (Örn: Aslanlar, Kartallar) oluşturun ve sesli AI ile &quot;Aslanlar yoklamada tam&quot; diyerek tek seferde tüm gruba puan/rapor girin.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenNewGroupModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md self-start sm:self-auto cursor-pointer shrink-0"
              >
                <Plus size={15} />
                <span>Yeni Grup Oluştur</span>
              </button>
            </div>

            <div className="p-6">
              {loadingGroups ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 size={18} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Gruplar yükleniyor...</span>
                </div>
              ) : teacherGroups.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Henüz tanımlanmış bir öğretmen grubu bulunmuyor.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      &quot;Yeni Grup Oluştur&quot; butonuna basarak kendi talebe grubunuzu (örneğin Aslanlar) tanımlayabilirsiniz.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewGroupModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus size={14} /> İlk Grubu Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherGroups.map(grp => (
                    <div
                      key={grp.id}
                      className="bg-slate-50/60 hover:bg-white border border-slate-200/80 hover:border-blue-300 rounded-2xl p-4 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🦁</span>
                            <h3 className="text-sm font-black text-slate-800">{grp.name}</h3>
                          </div>
                          <span className="text-[10px] bg-blue-100/80 text-blue-800 px-2 py-0.5 rounded-md font-extrabold">
                            {(grp.student_ids || []).length} Öğrenci
                          </span>
                        </div>

                        {grp.teacher_name && (
                          <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <span>Sorumlu:</span>
                            <span className="text-slate-600 font-bold">{grp.teacher_name}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                          {(grp.student_names || []).length > 0 ? (
                            grp.student_names.map((sn, idx) => (
                              <span key={idx} className="text-[9px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                {sn}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Öğrenci atanmamış</span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditGroupModal(grp)}
                          className="px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={13} /> Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(grp.id, grp.name)}
                          className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={13} /> Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          {/* ── Section: Öğretmen Yönetimi (Admin Only) ── */}
          {role === 'admin' && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="text-blue-600" size={18} />
                  <h2 className="font-extrabold text-slate-800 text-sm">Öğretmen Hesabı Kaydet &amp; Yönet</h2>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold border border-blue-100">
                  {teachers.length} Kayıtlı Öğretmen
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Öğretmen Ekleme Formu */}
                <form onSubmit={handleAddTeacher} autoComplete="off" className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                  {/* Dummy inputs to absorb browser autofill */}
                  <input type="text" name="faketeacherusername" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                  <input type="password" name="faketeacherpassword" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Yeni Öğretmen Ekle</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Öğretmen Adı Soyadı *</label>
                      <input
                        type="text"
                        name="new_teacher_name_field"
                        autoComplete="off"
                        placeholder="Örn: Ahmet Yılmaz"
                        value={newTeacherName}
                        onChange={e => setNewTeacherName(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">E-Posta Adresi (Opsiyonel)</label>
                      <input
                        type="text"
                        name="new_teacher_email_field"
                        autoComplete="new-password"
                        placeholder="Boş bırakılırsa otomatik üretilir"
                        value={newTeacherEmail}
                        onChange={e => setNewTeacherEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Şifre *</label>
                      <input
                        type="password"
                        name="new_teacher_password_field"
                        autoComplete="new-password"
                        placeholder="Giriş şifresi belirleyin"
                        value={newTeacherPassword}
                        onChange={e => setNewTeacherPassword(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={addingTeacher}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addingTeacher ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Öğretmen Hesabını Kaydet
                  </button>
                </form>

                {/* Öğretmen Listesi */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Kurum Öğretmenleri Listesi</h3>
                  
                  {teachers.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs italic">
                      Henüz eklenmiş öğretmen kaydı bulunmuyor.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {teachers.map(t => (
                        <div key={t.id || t.email} className="px-4 py-3 bg-white flex items-center justify-between hover:bg-slate-50/60 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                              {(t.name || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs">{t.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{t.email}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteTeacher(t.id || t.email)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs transition-all font-bold"
                            title="Öğretmeni Sil"
                          >
                            Sil
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* ── Section: Aşçı Ekle & Aşçı Yönetimi (Sadece Kurum İdarecisi) ── */}
          {role === 'admin' && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="bg-white rounded-3xl border border-amber-200/80 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-amber-100 bg-amber-50/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    👨‍🍳
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-sm">Aşçı Ekle & Yemek Menüsü Yönetimi</h2>
                    <p className="text-[11px] text-slate-500">Mutfak personeli hesabı tanımlayarak menü girişi yapmalarını sağlayın.</p>
                  </div>
                </div>

                <Link
                  href="/menu"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Utensils size={13} />
                  <span>Menü Paneline Git</span>
                </Link>
              </div>

              <div className="p-6 space-y-6">
                {/* Aşçı Ekleme Formu */}
                <form onSubmit={handleAddCook} autoComplete="off" className="bg-amber-50/30 border border-amber-100 p-4.5 rounded-2xl space-y-4">
                  {/* Dummy inputs to absorb browser autofill */}
                  <input type="text" name="fakecookusername" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                  <input type="password" name="fakecookpassword" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                  <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                    <Utensils size={14} className="text-amber-600" />
                    Yeni Aşçı Hesabı Oluştur
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Aşçı Adı Soyadı *</label>
                      <input
                        type="text"
                        name="new_cook_name_field"
                        autoComplete="off"
                        placeholder="Örn: Hasan Usta"
                        value={newCookName}
                        onChange={e => setNewCookName(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Kullanıcı Adı / E-posta (Opsiyonel)</label>
                      <input
                        type="text"
                        name="new_cook_email_field"
                        autoComplete="new-password"
                        placeholder="Boş bırakılırsa otomatik üretilir"
                        value={newCookEmail}
                        onChange={e => setNewCookEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Şifre *</label>
                      <input
                        type="password"
                        name="new_cook_password_field"
                        autoComplete="new-password"
                        placeholder="Giriş şifresi belirleyin"
                        value={newCookPassword}
                        onChange={e => setNewCookPassword(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={addingCook}
                    className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addingCook ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Aşçı Hesabını Kaydet
                  </button>
                </form>

                {/* Aşçı Listesi */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Kurum Aşçıları Listesi</h3>
                  
                  {cooks.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs italic">
                      Henüz eklenmiş aşçı kaydı bulunmuyor.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                      {cooks.map(c => (
                        <div key={c.id || c.email} className="px-4 py-3 bg-white flex items-center justify-between hover:bg-amber-50/30 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                              👨‍🍳
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs">{c.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{c.email}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteCook(c.id || c.email)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs transition-all font-bold"
                            title="Aşçıyı Sil"
                          >
                            Sil
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          )}

          {/* ── Section: Genel Ayarlar ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.20 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Target className="text-purple-500" size={16} />
              <h2 className="font-extrabold text-slate-800 text-sm">Genel Ayarlar</h2>
            </div>
            <form onSubmit={handleSaveGeneral} className="px-6 py-5 space-y-5">
              {/* Weekly goal */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-2 block">
                  Haftalık Hedef Rapor Sayısı
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={weeklyGoal}
                    onChange={e => setWeeklyGoal(Number(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none bg-slate-200 accent-blue-600"
                  />
                  <span className="w-12 text-center bg-blue-100 text-blue-800 font-extrabold text-sm rounded-xl px-2 py-1">
                    {weeklyGoal}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2 leading-normal">
                  Haftalık Özet sayfasında öğrenci başına beklenen haftalık rapor hedefi.
                </p>
              </div>

              {/* Notifications toggle */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <div>
                  <p className="font-bold text-sm text-slate-800">Veli Bildirimleri</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Rapor girilince veliye WhatsApp bildirimi gönderilsin mi?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(n => !n)}
                  className="transition-all focus:outline-none ml-4"
                >
                  {notificationsEnabled ? (
                    <ToggleRight size={44} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={44} className="text-slate-300" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={savingGeneral}
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {savingGeneral ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Genel Ayarları Kaydet
              </button>
            </form>
          </motion.section>

          {/* ── Section: Hızlı Bağlantılar ── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#0f172a] rounded-3xl border border-white/5 shadow-md overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="font-extrabold text-blue-200 text-xs uppercase tracking-wider">Hızlı Bağlantılar</h2>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { href: '/', label: 'Öğrenci Listesi', icon: User, color: 'text-blue-400' },
                { href: '/haftalik', label: 'Haftalık Özet', icon: Trophy, color: 'text-amber-400' },
                { href: '/tv', label: 'TV Ekranı', icon: Tv, color: 'text-cyan-400' },
                ...(role === 'admin' || role === 'cook' ? [{ href: '/menu', label: 'Yemek Menüsü', icon: Utensils, color: 'text-amber-400' }] : []),
                ...(leaveSettings.enabled ? [{ href: '/izinler', label: 'İzin Yönetimi', icon: Calendar, color: 'text-emerald-400' }] : []),
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:bg-white/10 transition-all group"
                >
                  <link.icon size={16} className={link.color} />
                  <span className="text-white font-semibold text-sm flex-1">{link.label}</span>
                  <ChevronRight size={14} className="text-white/30 group-hover:text-white/60 transition-all" />
                </Link>
              ))}
            </div>
          </motion.section>

        </div>
      </main>

      {/* ─── Create / Edit Group Modal ─── */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Users size={16} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {editingGroupId ? 'Grubu Düzenle' : 'Yeni Öğretmen Grubu Oluştur'}
                    </h3>
                    <p className="text-[10px] text-slate-500 truncate">Talebe grubunuzu ve üyelerini belirleyin</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveGroup} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                    Grup Adı * (Örn: Aslanlar, Kartallar, 10-A Grubu)
                  </label>
                  <input
                    type="text"
                    placeholder="Grup ismi yazın..."
                    value={groupFormName}
                    onChange={e => setGroupFormName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Gruptaki Öğrencileri Seç ({groupFormSelectedStudents.length} Seçili)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = allStudents.map(s => s.id);
                          setGroupFormSelectedStudents(allIds);
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Tümünü Seç
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setGroupFormSelectedStudents([])}
                        className="text-[10px] text-slate-500 font-bold hover:underline cursor-pointer"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>

                  {/* Student Search in Modal */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Öğrenci ara (isim, sınıf)..."
                      value={groupStudentSearch}
                      onChange={e => setGroupStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Students Checkbox List */}
                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50 p-1 bg-slate-50/40">
                    {allStudents
                      .filter(s => {
                        const q = groupStudentSearch.toLowerCase().trim();
                        if (!q) return true;
                        const fullName = `${s.name} ${s.surname}`.toLowerCase();
                        const cls = (s.class || '').toLowerCase();
                        return fullName.includes(q) || cls.includes(q);
                      })
                      .map(st => {
                        const isSelected = groupFormSelectedStudents.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                              isSelected ? 'bg-blue-100/70 text-blue-900 font-bold' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setGroupFormSelectedStudents(prev => [...prev, st.id]);
                                  } else {
                                    setGroupFormSelectedStudents(prev => prev.filter(id => id !== st.id));
                                  }
                                }}
                                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                              />
                              <span>{st.name} {st.surname}</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-500">
                              {st.class || 'Genel'}
                            </span>
                          </label>
                        );
                      })}
                    {allStudents.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">Kayıtlı öğrenci bulunamadı.</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowGroupModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={savingGroup}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingGroup ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {editingGroupId ? 'Değişiklikleri Kaydet' : 'Grubu Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Navigation ── */}
      <MobileBottomNav />

    </div>
  );
}
