import { useEffect, useState } from 'react';

/** Register the service worker in production builds only. */
export function registerSW() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline-first is best-effort */
    });
  });
}

/** Calls back when a waiting (new) worker is ready to take over. */
export function onSWUpdate(cb: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  let dead = false;
  const check = (reg: ServiceWorkerRegistration | undefined) => {
    if (dead || !reg) return;
    if (reg.waiting) {
      cb();
      return;
    }
    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        if (next.state === 'installed' && reg.waiting && !dead) cb();
      });
    });
  };
  void navigator.serviceWorker.getRegistration().then(check);
  void navigator.serviceWorker.ready.then(check);
  return () => {
    dead = true;
  };
}

export function applySWUpdate() {
  void navigator.serviceWorker.getRegistration().then((reg) => reg?.waiting?.postMessage({ type: 'SKIP_WAITING' }));
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
