'use client';

import { useEffect, useState } from 'react';

export default function PwaAutoUpdater() {
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Global hard-refresh function accessible from anywhere (header, settings, buttons)
    window.__hardRefreshApp = async () => {
      try {
        setUpdating(true);
        // Clear all CacheStorage
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        // Unregister or update all service workers
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.update()));
        }
        // Remove version cache tag
        localStorage.removeItem('yeb_app_build_id');
      } catch (e) {
        console.error('Hard refresh error:', e);
      } finally {
        // Force complete reload with cache busting query param
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now().toString());
        window.location.href = url.toString();
      }
    };

    // Auto-check version against server
    const checkVersion = async () => {
      try {
        const res = await fetch(`/api/app-version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });
        const data = await res.json();
        if (data && data.success && data.buildId) {
          const currentBuild = localStorage.getItem('yeb_app_build_id');
          if (currentBuild && currentBuild !== data.buildId) {
            console.log('Yeni uygulama sürümü tespit edildi, güncelleniyor...', data.buildId);
            setUpdating(true);
            localStorage.setItem('yeb_app_build_id', data.buildId);
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            setTimeout(() => {
              window.location.reload();
            }, 600);
          } else if (!currentBuild) {
            localStorage.setItem('yeb_app_build_id', data.buildId);
          }
        }
      } catch (e) {
        // Network offline or error
      }
    };

    checkVersion();

    // Service Worker update check
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update().catch(() => {});
      }).catch(() => {});

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // When phone unlocks or user switches back to browser tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) reg.update().catch(() => {});
          }).catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  if (!updating) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[99999] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-white/20 animate-pulse">
      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
      <span>Uygulama en güncel sürüme güncelleniyor...</span>
    </div>
  );
}
