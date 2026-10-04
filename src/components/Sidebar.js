'use client';

import { useAuth } from '@/lib/AuthContext';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  User, Trophy, Tv, Calendar, Settings, LogOut, Shield, Utensils, Sparkles, RefreshCw,
  Building2, ChevronLeft, ChevronRight, Menu, X, Check
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Shared Sidebar — fetches leave settings internally from the API.
 * Supports:
 * 1. Full height pinned desktop/tablet layout (never scrolls away or chops off).
 * 2. Collapse/expand mode (w-64 <-> w-20) with localStorage persistence.
 * 3. Tooltips and clean centered icon rail in collapsed mode.
 */
export default function Sidebar({ activeView, onSelectView }) {
  const {
    institutionName, institutionId, logoUrl, primaryColor,
    role, user, logout
  } = useAuth();

  const [imgErr, setImgErr] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const pc = primaryColor || '#06429c';

  // Load collapsed preference from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved !== null) {
        setCollapsed(saved === 'true');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // İzin yönetimi bütün kurumlarda daimi olarak açıktır.
  const leaveEnabled = true;

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

  const isActive = (item) => {
    if (pathname === '/') {
      if (item.view) {
        return (activeView || 'students') === item.view;
      }
      return pathname === item.href;
    }
    return pathname === item.href;
  };

  const navLinks = role === 'cook'
    ? [
        { href: '/menu', icon: Utensils, label: 'Yemek Menüsü' },
      ]
    : [
        { href: '/?view=ai', icon: Sparkles, label: 'Sesli Yapay Zekâ', view: 'ai' },
        { href: '/?view=students', icon: User, label: 'Öğrenciler', view: 'students' },
        { href: '/haftalik', icon: Trophy, label: 'Haftalık Özet' },
        { href: '/tv', icon: Tv, label: 'TV Ekranı' },
        ...(leaveEnabled ? [{ href: '/izinler', icon: Calendar, label: 'İzin Yönetimi' }] : []),
        { href: '/ayarlar', icon: Settings, label: 'Ayarlar' },
        ...(role === 'super_admin' ? [{ href: '/admin', icon: Shield, label: 'Süper Admin' }] : []),
      ];

  return (
    <aside
      className={`hidden md:flex text-white flex-col justify-between shrink-0 shadow-2xl print:hidden h-full md:h-screen overflow-y-auto overflow-x-hidden z-30 transition-all duration-300 relative select-none ${
        collapsed ? 'w-20 p-3' : 'w-64 p-6'
      }`}
      style={sidebarStyle}
    >
      <div>
        {/* Top Header & Collapse Button */}
        <div className={`relative flex flex-col items-center text-center pb-6 border-b border-white/10 ${collapsed ? 'pt-2' : 'pt-3'}`}>
          
          {/* Collapse / Expand Toggle Button */}
          <button
            onClick={toggleCollapse}
            type="button"
            className={`cursor-pointer transition-all flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white border border-white/15 ${
              collapsed
                ? 'w-10 h-10 mb-3 shadow-xs'
                : 'absolute -top-1 -right-2 p-1.5 shadow-sm'
            }`}
            title={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            aria-label={collapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={16} />}
          </button>

          {/* Logo */}
          <div
            className={`bg-white rounded-2xl flex items-center justify-center p-1.5 shadow-lg overflow-hidden shrink-0 transition-all duration-300 ${
              collapsed ? 'w-12 h-12' : 'w-16 h-16'
            }`}
            title={institutionName || 'Kurum'}
          >
            {!imgErr && logoUrl ? (
              <img src={logoUrl} alt={institutionName || 'Logo'} onError={() => setImgErr(true)} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-black text-xl rounded-xl">
                {institutionName ? institutionName.slice(0, 2).toUpperCase() : <Building2 size={24} />}
              </div>
            )}
          </div>

          {/* Title & Role (Hidden when collapsed) */}
          {!collapsed && (
            <div className="mt-3 min-w-0 px-1 w-full animate-fadeIn">
              <h2 className="text-xs font-black tracking-widest text-white/70 uppercase truncate">
                {(institutionName || 'Kurumsal Rapor').toUpperCase()}
              </h2>
              <p className="text-sm font-extrabold tracking-wider text-white truncate mt-0.5">
                {role === 'cook' ? 'AŞÇI PANELİ' : role === 'super_admin' ? 'SÜPER ADMİN' : 'YÖNETİCİ PANELİ'}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`space-y-1.5 ${collapsed ? 'mt-4' : 'mt-6'}`}>
          {navLinks.map((item) => {
            const { href, icon: Icon, label, view } = item;
            const active = isActive(item);

            if (view && onSelectView) {
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => {
                    onSelectView(view);
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', href);
                    }
                  }}
                  title={collapsed ? label : undefined}
                  className={`w-full flex items-center rounded-xl font-semibold text-sm transition-all cursor-pointer group relative ${
                    collapsed
                      ? 'justify-center p-3'
                      : 'gap-3 px-4 py-3 text-left'
                  } ${
                    active
                      ? 'bg-white/20 text-white font-bold shadow-md border border-white/25 ring-1 ring-white/20'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={collapsed ? 22 : 18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}

                  {/* Active dot in collapsed mode */}
                  {collapsed && active && (
                    <span className="absolute right-1.5 top-1.5 w-2 h-2 rounded-full bg-cyan-300 shadow-xs" />
                  )}
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center rounded-xl font-semibold text-sm transition-all group relative ${
                  collapsed
                    ? 'justify-center p-3'
                    : 'gap-3 px-4 py-3'
                } ${
                  active
                    ? 'bg-white/20 text-white font-bold shadow-md border border-white/25 ring-1 ring-white/20'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={collapsed ? 22 : 18} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}

                {/* Active dot in collapsed mode */}
                {collapsed && active && (
                  <span className="absolute right-1.5 top-1.5 w-2 h-2 rounded-full bg-cyan-300 shadow-xs" />
                )}
              </Link>
            );
          })}

          <div className="pt-2 border-t border-white/10 my-2 space-y-1">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.__hardRefreshApp) {
                  window.__hardRefreshApp();
                } else {
                  window.location.reload();
                }
              }}
              title={collapsed ? 'Sürümü Güncelle' : 'Sistemi ve önbelleği en güncel sürüme yenile'}
              className={`w-full flex items-center rounded-xl text-white/75 hover:text-cyan-200 hover:bg-white/10 font-semibold text-xs transition-all active:scale-95 cursor-pointer ${
                collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-2.5'
              }`}
            >
              <RefreshCw size={collapsed ? 20 : 15} className="shrink-0" />
              {!collapsed && <span className="truncate">Sürümü Güncelle</span>}
            </button>

            <button
              onClick={logout}
              title={collapsed ? 'Çıkış Yap' : undefined}
              className={`w-full flex items-center rounded-xl text-white/75 hover:text-red-300 hover:bg-red-500/20 font-semibold text-sm transition-all cursor-pointer ${
                collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
              }`}
            >
              <LogOut size={collapsed ? 20 : 18} className="shrink-0" />
              {!collapsed && <span className="truncate">Çıkış Yap</span>}
            </button>
          </div>
        </nav>
      </div>

      {/* Bottom branding */}
      <div className={`border-t border-white/10 flex items-center transition-all ${
        collapsed ? 'pt-4 justify-center' : 'pt-5 gap-3'
      }`}>
        <div
          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 p-0.5 shadow-md"
          title={institutionName || 'Aktif Kurum'}
        >
          {!imgErr && logoUrl ? (
            <img src={logoUrl} alt="" onError={() => setImgErr(true)} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-bold text-xs">
              {institutionName ? institutionName.slice(0, 2).toUpperCase() : 'EB'}
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="text-[11px] leading-tight min-w-0">
            <div className="font-bold text-white truncate">{institutionName || '—'}</div>
            <div className="text-white/60 text-[10px] font-medium">Aktif Kurum</div>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Mobile top header — with Hamburger Drawer & safe area padding */
export function MobileHeader({ title, rightAction, activeView, onSelectView }) {
  const { institutionName, institutionId, logoUrl, primaryColor, logout, role } = useAuth();
  const [imgErr, setImgErr] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const pc = primaryColor || '#06429c';

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 6, g: 66, b: 156 };
  };
  const rgb = hexToRgb(pc);
  const darkerColor = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
  const darkestColor = `rgb(${Math.max(0, rgb.r - 60)}, ${Math.max(0, rgb.g - 60)}, ${Math.max(0, rgb.b - 60)})`;

  const drawerStyle = {
    background: `linear-gradient(to bottom, ${pc}, ${darkerColor}, ${darkestColor})`,
  };

  const navLinks = role === 'cook'
    ? [
        { href: '/menu', icon: Utensils, label: 'Yemek Menüsü' },
      ]
    : [
        { href: '/?view=ai', icon: Sparkles, label: 'Sesli Yapay Zekâ', view: 'ai' },
        { href: '/?view=students', icon: User, label: 'Öğrenciler', view: 'students' },
        { href: '/haftalik', icon: Trophy, label: 'Haftalık Özet' },
        { href: '/tv', icon: Tv, label: 'TV Ekranı' },
        { href: '/izinler', icon: Calendar, label: 'İzin Yönetimi' },
        { href: '/ayarlar', icon: Settings, label: 'Ayarlar' },
        ...(role === 'super_admin' ? [{ href: '/admin', icon: Shield, label: 'Süper Admin' }] : []),
      ];

  const isActive = (item) => {
    if (pathname === '/') {
      if (item.view) {
        return (activeView || 'students') === item.view;
      }
      return pathname === item.href;
    }
    return pathname === item.href;
  };

  return (
    <>
      <header className="md:hidden bg-white/95 backdrop-blur-md px-3 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shadow-xs sticky top-0 z-30 border-b border-slate-100 safe-top-header w-full max-w-full overflow-hidden select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Yan Paneli Aç"
            aria-label="Yan Paneli Aç"
          >
            <Menu size={19} />
          </button>

          {/* Logo */}
          <div
            className="w-8 h-8 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 p-0.5 border border-slate-200/80 shadow-2xs"
          >
            {!imgErr && logoUrl ? (
              <img src={logoUrl} alt="" onError={() => setImgErr(true)} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-extrabold text-[11px]">
                {institutionName ? institutionName.slice(0, 2).toUpperCase() : 'EB'}
              </div>
            )}
          </div>

          <div className="text-left min-w-0 flex-1">
            <div className="text-[9px] font-bold leading-tight truncate tracking-wide" style={{ color: pc }}>
              {(institutionName || '').toUpperCase()}
            </div>
            <div className="text-xs font-black leading-tight text-slate-800 truncate">
              {title || institutionName || 'PANEL'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {rightAction}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.__hardRefreshApp) {
                window.__hardRefreshApp();
              } else {
                window.location.reload();
              }
            }}
            title="Uygulamayı ve önbelleği en güncel sürüme yenile"
            className="p-1.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={logout}
            title="Çıkış Yap"
            className="p-1.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors active:scale-95 flex items-center justify-center cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Slide-out Sidebar) */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-over panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              style={drawerStyle}
              className="relative w-72 max-w-[80vw] h-full text-white flex flex-col justify-between p-5 z-10 shadow-2xl overflow-y-auto safe-top-header safe-bottom-nav"
            >
              <div>
                {/* Header with Close */}
                <div className="flex items-center justify-between pb-5 border-b border-white/15">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1 shadow-md overflow-hidden shrink-0">
                      {!imgErr && logoUrl ? (
                        <img src={logoUrl} alt="" onError={() => setImgErr(true)} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-black text-lg">
                          {institutionName ? institutionName.slice(0, 2).toUpperCase() : <Building2 size={20} />}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-black tracking-widest text-white/70 uppercase truncate">
                        {(institutionName || 'Kurumsal Rapor').toUpperCase()}
                      </div>
                      <div className="text-xs font-black text-white truncate">
                        {role === 'cook' ? 'AŞÇI' : role === 'super_admin' ? 'SÜPER ADMİN' : 'YÖNETİCİ'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95"
                    title="Kapat"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Nav Links */}
                <nav className="mt-5 space-y-1.5">
                  {navLinks.map((item) => {
                    const { href, icon: Icon, label, view } = item;
                    const active = isActive(item);

                    if (view && onSelectView) {
                      return (
                        <button
                          key={href}
                          type="button"
                          onClick={() => {
                            onSelectView(view);
                            if (typeof window !== 'undefined') {
                              window.history.replaceState(null, '', href);
                            }
                            setDrawerOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                            active
                              ? 'bg-white/25 text-white shadow-md border border-white/20'
                              : 'text-white/75 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setDrawerOpen(false)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                          active
                            ? 'bg-white/25 text-white shadow-md border border-white/20'
                            : 'text-white/75 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}

                  <div className="pt-3 border-t border-white/15 my-2 space-y-1.5">
                    <button
                      onClick={() => {
                        setDrawerOpen(false);
                        if (typeof window !== 'undefined' && window.__hardRefreshApp) {
                          window.__hardRefreshApp();
                        } else {
                          window.location.reload();
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/80 hover:text-cyan-200 hover:bg-white/10 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <RefreshCw size={16} />
                      Sürümü Güncelle
                    </button>

                    <button
                      onClick={() => {
                        setDrawerOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-red-300 hover:bg-red-500/20 font-bold text-sm transition-all cursor-pointer"
                    >
                      <LogOut size={18} />
                      Çıkış Yap
                    </button>
                  </div>
                </nav>
              </div>

              {/* Bottom info */}
              <div className="pt-4 border-t border-white/15 flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-0.5 shrink-0">
                  {!imgErr && logoUrl ? (
                    <img src={logoUrl} alt="" onError={() => setImgErr(true)} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-900 bg-blue-50 font-bold text-[10px]">
                      {institutionName ? institutionName.slice(0, 2).toUpperCase() : 'EB'}
                    </div>
                  )}
                </div>
                <div className="text-[11px] min-w-0">
                  <div className="font-bold text-white truncate">{institutionName || '—'}</div>
                  <div className="text-white/60 text-[10px]">Aktif Kurum</div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Unified Mobile Bottom Navigation Bar with Safe Area Support */
export function MobileBottomNav({ activeView, onSelectView }) {
  const { user, institutionId, role } = useAuth();
  const pathname = usePathname();
  // İzin yönetimi bütün kurumlarda daimi olarak açıktır
  const leaveEnabled = true;

  if (role === 'cook') {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-around py-1.5 px-2 z-40 shadow-lg safe-bottom-nav">
        <Link href="/menu" className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 text-amber-600 font-bold min-w-0">
          <Utensils size={18} />
          <span className="text-[10px] leading-tight truncate">Menü</span>
        </Link>
        <Link href="/tv" className="flex-1 flex flex-col items-center justify-center py-1 gap-0.5 text-slate-400 hover:text-blue-600 min-w-0">
          <Tv size={18} />
          <span className="text-[10px] font-medium leading-tight truncate">TV</span>
        </Link>
      </nav>
    );
  }

  const isHomeActive = pathname === '/' && (!activeView || activeView === 'students');
  const isAiActive = pathname === '/' && activeView === 'ai';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-between py-1 px-1 z-40 shadow-lg safe-bottom-nav w-full max-w-full select-none">
      {pathname === '/' && onSelectView ? (
        <>
          <button
            type="button"
            onClick={() => onSelectView('ai')}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 gap-0.5 transition-colors cursor-pointer ${
              isAiActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles size={17} />
            <span className="text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full">Sesli AI</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectView('students')}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 gap-0.5 transition-colors cursor-pointer ${
              isHomeActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User size={17} />
            <span className="text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full">Öğrenciler</span>
          </button>
        </>
      ) : (
        <Link
          href="/?view=students"
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 gap-0.5 transition-colors ${
            pathname === '/' && isHomeActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-blue-600'
          }`}
        >
          <User size={17} />
          <span className="text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full">Öğrenciler</span>
        </Link>
      )}

      <Link
        href="/haftalik"
        className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 gap-0.5 transition-colors ${
          pathname === '/haftalik' ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-amber-500'
        }`}
      >
        <Trophy size={17} />
        <span className="text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full">Haftalık</span>
      </Link>

      <Link
        href="/tv"
        className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 gap-0.5 transition-colors ${
          pathname === '/tv' ? 'text-cyan-500 font-bold' : 'text-slate-400 hover:text-cyan-500'
        }`}
      >
        <Tv size={17} />
        <span className="text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full">TV</span>
      </Link>

      {leaveEnabled && (
        <Link
          href="/izinler"
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 gap-0.5 transition-colors ${
            pathname === '/izinler' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-emerald-600'
          }`}
        >
          <Calendar size={17} />
          <span className="text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full">İzinler</span>
        </Link>
      )}

      <Link
        href="/ayarlar"
        className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 gap-0.5 transition-colors ${
          pathname === '/ayarlar' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-blue-600'
        }`}
      >
        <Settings size={17} />
        <span className="text-[9.5px] sm:text-[10px] leading-tight truncate max-w-full">Ayarlar</span>
      </Link>
    </nav>
  );
}
