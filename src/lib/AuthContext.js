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
  const [role, setRole]                       = useState(null);
  const [institutionId, setInstitutionId]     = useState(null);
  const [institutionName, setInstitutionName] = useState(null);
  const [loading, setLoading]                 = useState(true);

  // Apply a local profile (from localStorage fallback session)
  const applyLocalProfile = (profile) => {
    setUser({ uid: profile.uid, email: profile.email, _local: true });
    setRole(profile.role || 'teacher');
    setInstitutionId(profile.institutionId);
    setInstitutionName(profile.institutionName);
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
            await signOut(auth);
            setUser(null);
            setRole(null);
            setInstitutionId(null);
            setInstitutionName(null);
            setLoading(false);
            return;
          }
          const data = await res.json();
          if (data.success && data.profile) {
            setRole(data.profile.role || 'teacher');
            setInstitutionId(data.profile.institutionId);
            setInstitutionName(data.profile.institutionName);
          } else {
            const isSuper = firebaseUser.email === 'admin@yeb.local';
            setRole(isSuper ? 'super_admin' : 'admin');
            setInstitutionId(isSuper ? 'platform' : 'yamanevler');
            setInstitutionName(isSuper ? 'Sistem Yönetimi' : 'Yamanevler Enderun Bilişim');
          }
        } catch (err) {
          console.error("Auth context load profile error:", err);
          const isSuper = firebaseUser.email === 'admin@yeb.local';
          setRole(isSuper ? 'super_admin' : 'admin');
          setInstitutionId(isSuper ? 'platform' : 'yamanevler');
          setInstitutionName(isSuper ? 'Sistem Yönetimi' : 'Yamanevler Enderun Bilişim');
        }
      } else {
        setUser(null);
        setRole(null);
        setInstitutionId(null);
        setInstitutionName(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('localUser');
    }
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, institutionId, institutionName, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
