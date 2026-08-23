'use client';

import { useEffect } from 'react';

export default function PwaAutoUpdater() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Check for updates on page load and visibility change
    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          reg.update().catch(() => {});
        }
      } catch (e) {}
    };

    checkForUpdates();

    // Listen for controllerchange event (new version activated)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // When app comes back to foreground (e.g. user taps icon from home screen)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    });
  }, []);

  return null;
}
