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
  };

  useEffect(() => {
    // Check localStorage for local (non-Firebase) session first
    try {
      const localUserJson = typeof window !== 'undefined' && localStorage.getItem('localUser');
      if (localUserJson) {
        const localProfile = JSON.parse(localUserJson);
        if (localProfile?.email) {
          applyLocalProfile(localProfile);
          setLoading(false);
          return; // Skip Firebase onAuthStateChanged if we have a local session
        }
      }
    } catch (e) {
      // ignore parse errors
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
            // Disabled account — sign out immediately
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
          } else {
            // Profile not found - use minimal defaults based on Firebase user
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
        setUser(null);
        setUserName(null);
        setRole(null);
        setInstitutionId(null);
        setInstitutionName(null);
        setLogoUrl('');
        setPrimaryColor('#06429c');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

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
