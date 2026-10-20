'use client';

import { useEffect, useRef } from 'react';

/**
 * PwaAutoUpdater:
 * Uygulamayı daha önce bir kere bile açmış olan herhangi bir telefon (özellikle eski Android ve iOS)
 * yeni bir sürüm çıktığında bunu otomatik algılar, eski önbelleği (CacheStorage) siler ve
 * sayfayı en güncel kodlarla yeniler.
 */
export default function PwaAutoUpdater() {
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Elle sert yenileme fonksiyonu (Ayarlar / Sidebar butonları için)
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

    const checkAppVersion = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        // En son reload zamanını kontrol et (sonsuz döngü koruması: min 45sn)
        const lastReloadTime = Number(localStorage.getItem('last_version_reload_time') || 0);
        if (Date.now() - lastReloadTime < 45000) {
          isCheckingRef.current = false;
          return;
        }

        const res = await fetch(`/api/app-version?_ts=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });

        if (!res.ok) {
          isCheckingRef.current = false;
          return;
        }

        const data = await res.json();
        if (data.success && data.buildId) {
          const localBuildId = localStorage.getItem('yeb_app_release_id');

          if (!localBuildId) {
            // İlk kez açılış, mevcut sürümü kaydet
            localStorage.setItem('yeb_app_release_id', data.buildId);
          } else if (localBuildId !== data.buildId) {
            console.log(`[PWA] Yeni sürüm tespit edildi: ${data.buildId}. Önbellek temizlenip güncelleniyor...`);
            localStorage.setItem('yeb_app_release_id', data.buildId);
            localStorage.setItem('last_version_reload_time', String(Date.now()));

            // Tüm cache ve service worker'ları temizle
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r => r.update()));
            }

            // Sayfayı en yeni sürümle yenile
            const targetUrl = new URL(window.location.href);
            targetUrl.searchParams.set('_rel', data.buildId);
            window.location.replace(targetUrl.toString());
            return;
          }
        }
      } catch (err) {
        // Ağ yoksa veya hata olursa sessizce devam et
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 1. Sayfa açıldığında kontrol et
    checkAppVersion();

    // 2. Uygulama arka plandan ön plana geldiğinde kontrol et (telefon kilidi açılınca / sekmeye dönünce)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAppVersion();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', checkAppVersion);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', checkAppVersion);
    };
  }, []);

  return null;
}
