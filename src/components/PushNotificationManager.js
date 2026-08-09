'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Bell, BellOff, Loader2 } from 'lucide-react';

export default function PushNotificationManager() {
  const { user, role, institutionId } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(true);

  const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BGXMIeWhD-WV3saRi1IFAbCSKNyhJc60I7KZbqhQPgI4BcLjY5h0TQJ_mY89W6r2QkEzxVH236wdnMoXhJne6xw';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      registerServiceWorker();
    } else {
      setLoading(false);
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.getSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error('Service Worker registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeUser = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        alert('Bildirim izni reddedildi. Lütfen tarayıcı ayarlarından bildirimlere izin verin.');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub,
          userId: user?.uid || user?.email || '',
          institutionId: institutionId || 'yamanevler',
          role: role || 'teacher',
        }),
      });

      setSubscription(sub);
    } catch (err) {
      console.error('Subscribe error:', err);
      alert('Bildirim aboneliği oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeUser = async () => {
    setLoading(true);
    try {
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        setSubscription(null);
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 backdrop-blur-md flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${subscription ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
          {subscription ? <Bell size={20} /> : <BellOff size={20} />}
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-200">
            {subscription ? 'Anlık İzin Bildirimleri Aktif 🔔' : 'Anlık İzin Bildirimleri Kapalı 🔕'}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {subscription
              ? 'Uygulama veya cihaz kapalı olsa bile yeni izin taleplerinde bildirim alacaksınız.'
              : 'Yeni bir izin talebi geldiğinde kapalı ekrana bildirim almak için aktifleştirin.'}
          </p>
        </div>
      </div>

      <button
        onClick={subscription ? unsubscribeUser : subscribeUser}
        disabled={loading}
        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
          subscription
            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-lg shadow-amber-500/10'
        }`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : subscription ? (
          'Bildirimleri Kapat'
        ) : (
          'Bildirimleri Aç'
        )}
      </button>
    </div>
  );
}
