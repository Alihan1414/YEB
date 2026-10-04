'use client';

import { useEffect } from 'react';

/**
 * PwaAutoUpdater — Silent helper.
 * Provides window.__hardRefreshApp for manual update button in sidebar/settings.
 * Does NOT pop up intrusive update banners or reload loops on app open.
 */
export default function PwaAutoUpdater() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Clean up any old version storage keys that caused repeat prompts
    try {
      localStorage.removeItem('yeb_app_build_id');
    } catch (e) {}

    // Global manual hard-refresh function (called only when user clicks "Sürümü Güncelle")
    window.__hardRefreshApp = async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.update()));
        }
      } catch (e) {
        console.error('Hard refresh error:', e);
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now().toString());
        window.location.href = url.toString();
      }
    };
  }, []);

  return null;
}
