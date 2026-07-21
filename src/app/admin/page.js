'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import {
  Shield, ArrowLeft, Plus, User, Mail,
  Check, X, Loader2, Edit2
} from 'lucide-react';

export default function AdminPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);

  // New user form
  const [newEmail, setNewEmail]     = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole]       = useState('teacher');
  const [newName, setNewName]       = useState('');
  const [creating, setCreating]     = useState(false);

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
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('name')));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Initialize a secondary App to prevent logging out the current admin
      const { initializeApp, getApp, deleteApp } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword, signOut } = await import('firebase/auth');
      const { doc, setDoc } = await import('firebase/firestore');

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Create a unique app name
      const appName = `SecondaryApp-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      // Create Firebase Auth account on secondary instance
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      
      // Save user metadata to primary Firestore database
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: newName,
        email: newEmail,
        role: newRole,
      });

      // Sign out and delete the secondary app
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('teacher');
      fetchUsers();
      showToast('Kullanıcı oluşturuldu!');
    } catch (e) { showToast('Hata: ' + e.message, 'error'); }
    finally { setCreating(false); }
  };

  const handleRoleChange = async (userId, newRoleValue) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRoleValue });
      fetchUsers();
      showToast('Rol güncellendi!');
    } catch (e) { showToast('Hata: ' + e.message, 'error'); }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 size={32} className="text-amber-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative">
      <div className="fixed top-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-amber-600/8 blur-[120px] pointer-events-none z-0" />

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')}
            className="p-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={18} />
          </button>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Shield size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              Yönetici Paneli
            </h1>
            <p className="text-zinc-600 text-xs mt-0.5">Kullanıcı yönetimi ve sistem ayarları</p>
          </div>
        </div>

        {/* Create User Form */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <Plus size={14} className="text-amber-400" />
            Yeni Kullanıcı Oluştur
          </h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input type="text" placeholder="Ad Soyad" value={newName} onChange={e => setNewName(e.target.value)} required
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 text-sm" />
            <input type="email" placeholder="E-posta" value={newEmail} onChange={e => setNewEmail(e.target.value)} required
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 text-sm" />
            <input type="password" placeholder="Şifre (min. 6 karakter)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 text-sm" />
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-zinc-300 focus:outline-none focus:border-amber-400/50 text-sm">
              <option value="teacher">Öğretmen</option>
              <option value="admin">Yönetici</option>
            </select>
            <button type="submit" disabled={creating}
              className="bg-amber-500 text-black font-bold rounded-xl py-3 hover:bg-amber-400 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Oluştur
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/8 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <User size={14} className="text-zinc-400" />
            Mevcut Kullanıcılar
            <span className="text-xs font-bold bg-white/8 text-zinc-500 border border-white/10 px-2 py-0.5 rounded-full ml-1">{users.length}</span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="text-amber-400 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center font-bold text-sm text-white">
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{u.name || '—'}</div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1"><Mail size={10} />{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={u.role || 'teacher'}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="bg-zinc-900 border border-white/10 text-xs text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400/50"
                    >
                      <option value="teacher">Öğretmen</option>
                      <option value="admin">Yönetici</option>
                    </select>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-zinc-700 text-sm py-8">Kullanıcı bulunamadı.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
