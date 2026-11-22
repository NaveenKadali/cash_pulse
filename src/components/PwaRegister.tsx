'use client';

import { useEffect, useState } from 'react';
import { Download, CheckCircle2, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] ServiceWorker registration error:', err);
          });
      });
    }

    // 2. Intercept beforeinstallprompt for native PWA installation
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log('[PWA] CashPulse successfully installed as standalone application.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstallBanner || installed) {
    return null;
  }

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[#0f172a]/95 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white transition-all animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            Install CashPulse App
          </div>
          <p className="text-xs text-slate-400">
            Quick launch from your Home Screen with offline runway review.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition shadow-sm"
        >
          Install
        </button>
        <button
          onClick={() => setShowInstallBanner(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
