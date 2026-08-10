'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]                       = useState(null);
  const [userName, setUserName]               = useState(null);
  const [role, setRole]                       = useState(null);
  const [institutionId, setInstitutionId]     = useState(null);
  const [institutionName, setInstitutionName] = useState(null);
  const [logoUrl, setLogoUrl]                 = useState('');
  const [primaryColor, setPrimaryColor]       = useState('#06429c');
  const [enabledModules, setEnabledModules]   = useState({ ai: true, leave: true, tv: true, weekly: true });
  const [loading, setLoading]                 = useState(true);

  // Apply a local profile (from localStorage fallback session)
  const applyLocalProfile = (profile) => {
    setUser({ uid: profile.uid, email: profile.email, name: profile.name, _local: true });
    setUserName(profile.name || '');
    setRole(profile.role || 'teacher');
    setInstitutionId(profile.institutionId);
    setInstitutionName(profile.institutionName);
    setLogoUrl(profile.logoUrl || '');
    setPrimaryColor(profile.primaryColor || '#06429c');
    if (profile.enabledModules) setEnabledModules(profile.enabledModules);
    setLoading(false);
  };

  const login = (email, password) => {
    const parts = email.split('@');
    const firebaseEmail = (parts.length === 2 && !parts[1].includes('.'))
      ? `${parts[0]}@${parts[1]}.com`
      : email;
    return signInWithEmailAndPassword(auth, firebaseEmail, password);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('localUser');
      localStorage.clear();
    }
    setUser(null);
    setUserName(null);
    setRole(null);
    setInstitutionId(null);
    setInstitutionName(null);
    setLogoUrl('');
    setPrimaryColor('#06429c');
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const CURRENT_SESSION_VERSION = 'v2026_08_09_FORCE_RESET_V100';

  useEffect(() => {
    let isMounted = true;
    try {
      if (typeof window !== 'undefined') {
        const storedVersion = localStorage.getItem('app_session_version');
        if (storedVersion !== CURRENT_SESSION_VERSION) {
          // Only clear localUser (not entire localStorage) to avoid wiping valid sessions on dev
          localStorage.removeItem('localUser');
          localStorage.setItem('app_session_version', CURRENT_SESSION_VERSION);
        }
      }

      const localUserJson = typeof window !== 'undefined' && localStorage.getItem('localUser');
      if (localUserJson) {
        const localProfile = JSON.parse(localUserJson);
        if (localProfile?.email) {
          applyLocalProfile(localProfile);
          setLoading(false);
          // Async sync with latest profile from server - if account deleted/disabled on server, force logout!
          fetch(`/api/users/profile?uid=${encodeURIComponent(localProfile.uid || localProfile.id || '')}&email=${encodeURIComponent(localProfile.email)}`, { cache: 'no-store' })
            .then(r => {
              if (r.status === 403) {
                // Only force logout if explicitly disabled by platform admin (403)
                if (typeof window !== 'undefined') localStorage.clear();
                setUser(null);
                window.location.replace('/login');
                return null;
              }
              return r.json();
            })
            .then(data => {
              if (!data) return;
              if (isMounted && data.success && data.profile) {
                applyLocalProfile(data.profile);
              }
            })
            .catch(() => {});
          return () => { isMounted = false; };
        }
      }
    } catch (e) {
      if (typeof window !== 'undefined') localStorage.clear();
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const res = await fetch(
            `/api/users/profile?uid=${firebaseUser.uid}&email=${encodeURIComponent(firebaseUser.email || '')}`,
            { cache: 'no-store' }
          );
          if (res.status === 403) {
            await logout();
            return;
          }
          const data = await res.json();
          if (data.success && data.profile) {
            setUserName(data.profile.name || firebaseUser.displayName || '');
            setRole(data.profile.role || 'teacher');
            setInstitutionId(data.profile.institutionId);
            setInstitutionName(data.profile.institutionName);
            setLogoUrl(data.profile.logoUrl || '');
            setPrimaryColor(data.profile.primaryColor || '#06429c');
            if (data.profile.enabledModules) setEnabledModules(data.profile.enabledModules);
            // Save to localStorage for fallback
            if (isMounted && typeof window !== 'undefined') {
              localStorage.setItem('localUser', JSON.stringify(data.profile));
            }
          } else {
            const isSuper = firebaseUser.email === 'admin@yeb.local';
            setUserName(isSuper ? 'Sistem Yöneticisi' : (firebaseUser.displayName || ''));
            setRole(isSuper ? 'super_admin' : 'teacher');
            setInstitutionId(isSuper ? 'platform' : null);
            setInstitutionName(isSuper ? 'Sistem Yönetimi' : null);
          }
        } catch (err) {
          console.error('Auth context load profile error:', err);
          const isSuper = firebaseUser.email === 'admin@yeb.local';
          setUserName(isSuper ? 'Sistem Yöneticisi' : (firebaseUser.displayName || ''));
          setRole(isSuper ? 'super_admin' : 'teacher');
          setInstitutionId(isSuper ? 'platform' : null);
          setInstitutionName(isSuper ? 'Sistem Yönetimi' : null);
        }
      } else {
        const hasLocalUser = typeof window !== 'undefined' && !!localStorage.getItem('localUser');
        if (!hasLocalUser) {
          setUser(null);
          setUserName(null);
          setRole(null);
          setInstitutionId(null);
          setInstitutionName(null);
          setLogoUrl('');
          setPrimaryColor('#06429c');
        }
      }
      if (isMounted) setLoading(false);
    });

    // ── Güvenlik ağı: Firebase 2 saniye içinde cevap vermezse loading'i zorla kapat ──
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth: Firebase timeout — forcing loading=false');
        setLoading(false);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      unsub();
    };
  }, []);


  return (
    <AuthContext.Provider value={{
      user, userName, role, institutionId, institutionName,
      logoUrl, primaryColor, enabledModules,
      loading, login, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
