'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowLeft, Plus, User, Loader2,
  TrendingUp, LogOut, Building2, Check, X,
  Eye, EyeOff, Users, RefreshCw, ChevronRight
} from 'lucide-react';

export default function AdminPage() {
  const { user, role, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [allUsers, setAllUsers]     = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [toast, setToast]           = useState(null);
  const [activeTab, setActiveTab]   = useState('institutions'); // 'institutions' | 'users' | 'create'

  // New user form
  const [newName, setNewName]         = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole]         = useState('teacher');
  const [newInstId, setNewInstId]     = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [creating, setCreating]       = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) { router.push('/login'); return; }
      if (role !== 'admin') { router.push('/'); return; }
      fetchUsers();
    }
  }, [user, role, authLoading]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const res  = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?key=${apiKey}`
      );
      const data = await res.json();
      const list = (data.documents || []).map(doc => {
        const f = doc.fields || {};
        return {
          id:              doc.name.split('/').pop(),
          name:            f.name?.stringValue            || '',
          email:           f.email?.stringValue           || '',
          username:        f.username?.stringValue        || '',
          role:            f.role?.stringValue            || 'teacher',
          institutionId:   f.institutionId?.stringValue   || 'yamanevler',
          institutionName: f.institutionName?.stringValue || 'Yamanevler Enderun Bilişim',
        };
      });
      list.sort((a, b) => a.institutionId.localeCompare(b.institutionId, 'tr'));
      setAllUsers(list);
    } catch (e) {
      console.error(e);
      showToast('Veriler yüklenemedi.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Group users by institution
  const institutions = Object.values(
    allUsers.reduce((acc, u) => {
      const key = u.institutionId;
      if (!acc[key]) acc[key] = { id: key, name: u.institutionName, users: [] };
      acc[key].users.push(u);
      return acc;
    }, {})
  );

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newInstId) {
      showToast('E-posta, şifre ve Kurum ID zorunludur.', 'error');
      return;
    }
    setCreating(true);
    try {
      const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      const signUpRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newEmail, password: newPassword, returnSecureToken: true }),
        }
      );
      const signUpData = await signUpRes.json();
      if (signUpData.error) throw new Error(signUpData.error.message);

      const { localId: uid, idToken } = signUpData;

      await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({
            fields: {
              name:            { stringValue: newName || newUsername || '' },
              email:           { stringValue: newEmail },
              username:        { stringValue: newUsername || '' },
              role:            { stringValue: newRole },
              institutionId:   { stringValue: newInstId },
              institutionName: { stringValue: newInstName || newInstId },
            },
          }),
        }
      );

      // Reset form
      setNewName(''); setNewUsername(''); setNewEmail('');
      setNewPassword(''); setNewRole('teacher');
      setNewInstId(''); setNewInstName('');
      setActiveTab('institutions');
      await fetchUsers();
      showToast('Kullanıcı başarıyla oluşturuldu!');
    } catch (e) {
      const msg = e.message === 'EMAIL_EXISTS'
        ? 'Bu e-posta zaten kayıtlı.'
        : e.message;
      showToast('Hata: ' + msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId, newRoleValue) => {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?updateMask.fieldPaths=role&key=${apiKey}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { role: { stringValue: newRoleValue } } }),
        }
      );
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRoleValue } : u));
      showToast('Rol güncellendi!');
    } catch (e) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-[#eef5fc] flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef5fc] text-slate-800 flex flex-col md:flex-row font-sans">

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-64 bg-gradient-to-b from-[#06429c] via-[#053787] to-[#011c4d] text-white flex-col justify-between p-6 shrink-0 shadow-2xl">
        <div>
          <div className="flex flex-col items-center text-center space-y-2 pt-4 pb-8 border-b border-white/10">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-lg">
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#06429c]" fill="currentColor">
                <path d="M50 15 L20 30 L50 45 L80 30 Z M20 40 L20 70 L50 85 L50 55 Z M80 40 L50 55 L50 85 L80 70 Z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest text-blue-200 uppercase">Platform</p>
              <h1 className="text-sm font-extrabold text-white">Admin Paneli</h1>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            <a href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all">
              <User size={18} /> Öğrenciler
            </a>
            <a href="/summary" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-white hover:bg-white/10 font-semibold text-sm transition-all">
              <TrendingUp size={18} /> Özet Raporlar
            </a>
            <a href="/admin" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600/90 text-white font-bold text-sm shadow-md border border-blue-400/30">
              <Shield size={18} /> Admin Paneli
            </a>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-100/70 hover:text-red-300 hover:bg-red-500/10 font-semibold text-sm transition-all">
              <LogOut size={18} /> Çıkış Yap
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="text-[10px] text-blue-200/50 uppercase tracking-widest mb-2">Platform İstatistikleri</div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-blue-200/70">Toplam Kurum</span>
              <span className="font-bold text-white">{institutions.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-blue-200/70">Toplam Kullanıcı</span>
              <span className="font-bold text-white">{allUsers.length}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto pb-16">

        {/* Page Header */}
        <div className="bg-white border-b border-slate-100 px-6 md:px-10 py-6">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-all">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900">Platform Yönetimi</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Sistemi kullanan kurumlar ve kullanıcılar burada yönetilir.
              </p>
            </div>
            <button onClick={fetchUsers} title="Yenile" className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-all">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 mt-6 space-y-6">

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 ${
                  toast.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}
              >
                {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Kayıtlı Kurum',     value: institutions.length, icon: Building2, color: 'blue' },
              { label: 'Toplam Kullanıcı',  value: allUsers.length,     icon: Users,     color: 'indigo' },
              { label: 'Yöneticiler',       value: allUsers.filter(u => u.role === 'admin').length, icon: Shield, color: 'purple' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  color === 'blue'   ? 'bg-blue-50 text-blue-600' :
                  color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{value}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit flex-wrap">
            {[
              { key: 'institutions', label: 'Kurumlar', icon: Building2 },
              { key: 'users',        label: 'Tüm Kullanıcılar', icon: Users },
              { key: 'create',       label: 'Yeni Kullanıcı Ekle', icon: Plus },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon size={13} /> {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Institutions ── */}
          {activeTab === 'institutions' && (
            <div className="space-y-4">
              {loadingUsers ? (
                <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-100">
                  <Loader2 size={24} className="text-blue-600 animate-spin" />
                </div>
              ) : institutions.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 text-sm">
                  <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                  Henüz kayıtlı kurum yok.
                </div>
              ) : (
                institutions.map(inst => (
                  <div key={inst.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Institution Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/30 border-b border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#06429c] text-white rounded-xl flex items-center justify-center shrink-0 font-black text-sm shadow-sm">
                        {(inst.name || inst.id)[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-extrabold text-slate-900 text-sm">{inst.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">{inst.id}</code>
                          <span className="text-[10px] text-slate-400">{inst.users.length} kullanıcı</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setNewInstId(inst.id); setNewInstName(inst.name); setActiveTab('create'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
                      >
                        <Plus size={12} /> Kullanıcı Ekle
                      </button>
                    </div>

                    {/* Users in this institution */}
                    <div className="divide-y divide-slate-50">
                      {inst.users.map(u => (
                        <div key={u.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 text-xs truncate">{u.name || '—'}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {u.username && <span className="font-mono text-blue-500 font-semibold mr-1">@{u.username}</span>}
                              {u.email}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {u.role === 'admin' ? '⚡ Yönetici' : '👨‍🏫 Öğretmen'}
                            </span>
                            <select
                              value={u.role}
                              onChange={e => handleRoleChange(u.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-[10px] text-slate-600 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                            >
                              <option value="teacher">Öğretmen yap</option>
                              <option value="admin">Yönetici yap</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── TAB: All Users ── */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900">Tüm Kullanıcılar</h2>
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-100">{allUsers.length} kullanıcı</span>
              </div>
              {loadingUsers ? (
                <div className="flex justify-center py-12"><Loader2 size={24} className="text-blue-600 animate-spin" /></div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {allUsers.map(u => (
                    <div key={u.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#06429c] to-[#1b63d6] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        {(u.name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{u.name || '—'}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {u.username && <span className="font-mono text-blue-500 font-semibold mr-2">@{u.username}</span>}
                          {u.email}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Building2 size={10} className="text-slate-400" />
                          <span className="text-[10px] text-slate-500">{u.institutionName}</span>
                          <code className="text-[9px] font-mono text-blue-500 bg-blue-50 px-1 rounded ml-1">{u.institutionId}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {u.role === 'admin' ? '⚡ Yönetici' : '👨‍🏫 Öğretmen'}
                        </span>
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs text-slate-600 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                        >
                          <option value="teacher">Öğretmen yap</option>
                          <option value="admin">Yönetici yap</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {allUsers.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">Kullanıcı bulunamadı.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Create User ── */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Plus size={16} className="text-blue-600" /> Yeni Kullanıcı Oluştur
                </h2>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Yeni bir kullanıcı ekleyin. Kurum ID'yi mevcut bir kurumla aynı yaparsanız o kuruma katılır.
                  Farklı bir Kurum ID verirseniz yeni bir kurum oluşturulur.
                </p>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-6">

                {/* Section 1: Kişisel Bilgiler */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Kişisel Bilgiler</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Ad Soyad</label>
                      <input type="text" placeholder="Örn: Ahmet Yılmaz" value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-300 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Kullanıcı Adı</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono font-bold">@</span>
                        <input type="text" placeholder="ogretmen1" value={newUsername}
                          onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-300 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Giriş Bilgileri */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Giriş Bilgileri</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">E-posta <span className="text-red-400">*</span></label>
                      <input type="email" placeholder="ogretmen@okul.com" value={newEmail}
                        onChange={e => setNewEmail(e.target.value)} required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-300 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Şifre <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} placeholder="En az 6 karakter" value={newPassword}
                          onChange={e => setNewPassword(e.target.value)} required minLength={6}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-300 transition-all"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Kurum */}
                <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/30 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 size={12} /> Kurum Bilgileri
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-blue-700 mb-1.5 block">Kurum ID <span className="text-red-400">*</span></label>
                      <input type="text" placeholder="örn: yamanevler, umraniye" value={newInstId}
                        onChange={e => setNewInstId(e.target.value.toLowerCase().replace(/\s/g, ''))} required
                        className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-300 transition-all"
                      />
                      <p className="text-[10px] text-blue-400 mt-1">Küçük harf, boşluksuz. Mevcut kuruma eklemek için aynı ID'yi kullanın.</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-blue-700 mb-1.5 block">Kurum Adı</label>
                      <input type="text" placeholder="Örn: Ümraniye Bilişim" value={newInstName}
                        onChange={e => setNewInstName(e.target.value)}
                        className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 placeholder-slate-300 transition-all"
                      />
                      <p className="text-[10px] text-blue-400 mt-1">Sidebar ve bildirimlerde görünür.</p>
                    </div>
                  </div>

                  {/* Existing institutions hint */}
                  {institutions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] text-blue-500 font-semibold self-center">Mevcut kurumlar:</span>
                      {institutions.map(inst => (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => { setNewInstId(inst.id); setNewInstName(inst.name); }}
                          className="text-[10px] px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-lg font-mono font-semibold hover:bg-blue-50 transition-all flex items-center gap-1"
                        >
                          {inst.id} <ChevronRight size={9} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 4: Rol */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Rol</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { value: 'teacher', emoji: '👨‍🏫', label: 'Öğretmen', desc: 'Öğrencileri ve raporları görebilir, rapor ekleyebilir.' },
                      { value: 'admin',   emoji: '⚡',    label: 'Yönetici', desc: 'Tüm yetkiler + Admin paneline erişim.' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewRole(opt.value)}
                        className={`px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                          newRole === opt.value
                            ? 'border-blue-500 bg-blue-50/60'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-sm font-bold text-slate-800">{opt.emoji} {opt.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <button
                    type="submit" disabled={creating}
                    className="bg-[#06429c] text-white font-bold rounded-2xl py-3 px-8 hover:bg-blue-700 transition-all text-sm shadow-lg shadow-blue-900/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={16} /> Kullanıcı Oluştur</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="text-center text-xs text-slate-400 pb-6">
            © 2025 Öğrenci Rapor Sistemi — Platform Admin Paneli
          </div>
        </div>
      </main>
    </div>
  );
}
