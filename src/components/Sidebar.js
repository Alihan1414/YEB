'use client';

import { useAuth } from '@/lib/AuthContext';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  User, Trophy, Tv, Calendar, Settings, LogOut, Shield, Utensils, Sparkles
} from 'lucide-react';

import Link from 'next/link';
import { Building2 } from 'lucide-react';

/**
 * Shared Sidebar — fetches leave settings internally from the API.
 * No longer depends on a leaveEnabled prop from parent pages.
 */
export default function Sidebar({ activeView, onSelectView }) {
  const {
    institutionName, institutionId, logoUrl, primaryColor,
    role, user, logout
  } = useAuth();

  const [imgErr, setImgErr] = useState(false);
  const pathname = usePathname();
  const pc = primaryColor || '#06429c';

  // Self-managed leave enabled state — fetched directly from API
  const [leaveEnabled, setLeaveEnabled] = useState(false);

  useEffect(() => {
    if (!user || !institutionId) return;
    const instId = institutionId || 'yamanevler';
    fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) setLeaveEnabled(!!d.settings.enabled);
      })
      .catch(() => {});
  }, [user, institutionId, pathname]); // Re-check on every page navigation

  // Darken for gradient: create a slightly darker shade by mixing with black
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 6, g: 66, b: 156 };
  };
  const rgb = hexToRgb(pc);
  const darkerColor = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
  const darkestColor = `rgb(${Math.max(0, rgb.r - 60)}, ${Math.max(0, rgb.g - 60)}, ${Math.max(0, rgb.b - 60)})`;

  const sidebarStyle = {
    background: `linear-gradient(to bottom, ${pc}, ${darkerColor}, ${darkestColor})`,
  };

  const isActive = (href) => {
    if (pathname === '/') {
      // If we have activeView prop (on home page), only highlight Öğrenciler if activeView === 'students'
      if (href === '/') return !activeView || activeView === 'students';
      return pathname === href;
    }
    return pathname === href;
  };

  const navLinks = role === 'cook'
    ? [
        { href: '/menu', icon: Utensils, label: 'Yemek Menüsü' },
      ]
    : [
        { href: '/', icon: User, label: 'Öğrenciler' },
        { href: '/haftalik', icon: Trophy, label: 'Haftalık Özet' },
        { href: '/tv', icon: Tv, label: 'TV Ekranı' },
        ...(leaveEnabled ? [{ href: '/izinler', icon: Calendar, label: 'İzin Yönetimi' }] : []),
        { href: '/ayarlar', icon: Settings, label: 'Ayarlar' },
        ...(role === 'super_admin' ? [{ href: '/admin', icon: Shield, label: 'Süper Admin' }] : []),
      ];

  return (
    <aside
      className="hidden md:flex w-64 text-white flex-col justify-between p-6 shrink-0 shadow-2xl print:hidden sticky top-0 h-screen overflow-y-auto z-30 transition-all duration-300"
      style={sidebarStyle}
    >
      <div>
        {/* Logo / Institution */}
        <div className="flex flex-col items-center text-center space-y-3 pt-4 pb-8 border-b border-white/10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-lg overflow-hidden shrink-0">
            {!imgErr && logoUrl ? (
              <img src={logoUrl} alt={institutionName || 'Logo'} onError={() => setImgErr(true)} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-black text-xl rounded-xl">
                {institutionName ? institutionName.slice(0, 2).toUpperCase() : <Building2 size={24} />}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xs font-black tracking-widest text-white/70 uppercase">
              {(institutionName || 'Kurumsal Rapor').toUpperCase()}
            </h2>
            <p className="text-sm font-extrabold tracking-wider text-white">
              {role === 'cook' ? 'AŞÇI PANELİ' : role === 'super_admin' ? 'SÜPER ADMİN' : 'YÖNETİCİ PANELİ'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-8 space-y-2">
          {navLinks.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            if (href === '/' && onSelectView) {
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => onSelectView('students')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all text-left ${
                    active
                      ? 'bg-white/20 text-white font-bold shadow-md border border-white/20'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  active
                    ? 'bg-white/20 text-white font-bold shadow-md border border-white/20'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-red-300 hover:bg-red-500/10 font-semibold text-sm transition-all"
          >
            <LogOut size={18} />
            Çıkış
          </button>
        </nav>
      </div>

      {/* Bottom branding */}
      <div className="pt-6 border-t border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 p-0.5">
          {!imgErr && logoUrl ? (
            <img src={logoUrl} alt="" onError={() => setImgErr(true)} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-bold text-xs">
              {institutionName ? institutionName.slice(0, 2).toUpperCase() : 'EB'}
            </div>
          )}
        </div>
        <div className="text-[11px] leading-tight min-w-0">
          <div className="font-bold text-white truncate">{institutionName || '—'}</div>
          <div className="text-white/50 text-[10px]">Aktif Kurum</div>
        </div>
      </div>
    </aside>
  );
}

/** Mobile top header — also uses institution primaryColor */
export function MobileHeader({ title, rightAction }) {
  const { institutionName, institutionId, logoUrl, primaryColor, logout } = useAuth();
  const [imgErr, setImgErr] = useState(false);
  const pc = primaryColor || '#06429c';

  return (
    <header className="md:hidden bg-white px-5 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className="w-8 h-8 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 p-0.5 border border-slate-100"
        >
          {!imgErr && logoUrl ? (
            <img src={logoUrl} alt="" onError={() => setImgErr(true)} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-extrabold text-xs">
              {institutionName ? institutionName.slice(0, 2).toUpperCase() : 'EB'}
            </div>
          )}
        </div>
        <div className="text-left min-w-0">
          <div className="text-[9px] font-bold leading-none truncate" style={{ color: pc }}>
            {(institutionName || '').toUpperCase()}
          </div>
          <div className="text-[11px] font-extrabold leading-none text-slate-800 truncate">
            {title || institutionName || 'PANEL'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightAction}
        <button onClick={logout} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

/** Unified Mobile Bottom Navigation Bar */
export function MobileBottomNav({ activeView, onSelectView }) {
  const { user, institutionId, role } = useAuth();
  const pathname = usePathname();
  const [leaveEnabled, setLeaveEnabled] = useState(false);

  useEffect(() => {
    if (!user || !institutionId) return;
    const instId = institutionId || 'yamanevler';
    fetch(`/api/admin/leave-settings?institutionId=${encodeURIComponent(instId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.settings) setLeaveEnabled(!!d.settings.enabled);
      })
      .catch(() => {});
  }, [user, institutionId, pathname]);

  if (role === 'cook') {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-2.5 px-2 z-40 shadow-lg">
        <Link href="/menu" className="flex flex-col items-center gap-1 text-amber-600 font-bold">
          <Utensils size={18} />
          <span className="text-[10px]">Menü</span>
        </Link>
        <Link href="/tv" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600">
          <Tv size={18} />
          <span className="text-[10px] font-medium">TV</span>
        </Link>
      </nav>
    );
  }

  const isHomeActive = pathname === '/' && (!activeView || activeView === 'students');
  const isAiActive = pathname === '/' && activeView === 'ai';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-2.5 px-2 z-40 shadow-lg">
      {pathname === '/' && onSelectView ? (
        <>
          <button
            type="button"
            onClick={() => onSelectView('ai')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isAiActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles size={18} />
            <span className="text-[10px]">Sesli AI</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectView('students')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isHomeActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User size={18} />
            <span className="text-[10px]">Öğrenciler</span>
          </button>
        </>
      ) : (
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === '/' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-blue-600'
          }`}
        >
          <User size={18} />
          <span className="text-[10px]">Öğrenciler</span>
        </Link>
      )}

      <Link
        href="/haftalik"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === '/haftalik' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-amber-500'
        }`}
      >
        <Trophy size={18} />
        <span className="text-[10px]">Haftalık</span>
      </Link>

      <Link
        href="/tv"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === '/tv' ? 'text-cyan-500 font-bold' : 'text-slate-400 hover:text-cyan-500'
        }`}
      >
        <Tv size={18} />
        <span className="text-[10px]">TV</span>
      </Link>

      {leaveEnabled && (
        <Link
          href="/izinler"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === '/izinler' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-emerald-600'
          }`}
        >
          <Calendar size={18} />
          <span className="text-[10px]">İzinler</span>
        </Link>
      )}

      <Link
        href="/ayarlar"
        className={`flex flex-col items-center gap-1 transition-colors ${
          pathname === '/ayarlar' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-blue-600'
        }`}
      >
        <Settings size={18} />
        <span className="text-[10px]">Ayarlar</span>
      </Link>
    </nav>
  );
}
