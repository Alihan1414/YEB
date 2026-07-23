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
  const [user, setUser]                   = useState(null);
  const [role, setRole]                   = useState(null);
  const [institutionId, setInstitutionId] = useState(null);
  const [institutionName, setInstitutionName] = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch full profile (role + institution) from our API
        try {
          const res = await fetch(
            `/api/users/profile?uid=${firebaseUser.uid}&email=${encodeURIComponent(firebaseUser.email || '')}`,
            { cache: 'no-store' }
          );
          const data = await res.json();
          if (data.success && data.profile) {
            setRole(data.profile.role || 'teacher');
            setInstitutionId(data.profile.institutionId || 'yamanevler');
            setInstitutionName(data.profile.institutionName || 'Yamanevler Enderun Bilişim');
          } else {
            // Safe defaults
            setRole('admin');
            setInstitutionId('yamanevler');
            setInstitutionName('Yamanevler Enderun Bilişim');
          }
        } catch {
          setRole('admin');
          setInstitutionId('yamanevler');
          setInstitutionName('Yamanevler Enderun Bilişim');
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

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, institutionId, institutionName, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
