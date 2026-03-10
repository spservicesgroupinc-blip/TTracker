import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 767px)').matches);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up rounded-2xl border border-fb-divider bg-white p-4 shadow-fb-xl md:bottom-4 sm:left-auto sm:right-4 sm:w-80">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fb-blue to-fb-green">
          <span className="text-xs font-extrabold text-white tracking-tight">RFE</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-fb-text">Install Field OS</p>
          <p className="mt-0.5 text-xs font-medium text-fb-text-secondary">
            {isMobile
              ? 'Add to your Home Screen for faster launch and better offline use.'
              : 'Install as an app for quick access and offline support.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 rounded-lg bg-gradient-to-r from-fb-blue to-fb-blue-dark px-3 py-2 text-xs font-extrabold text-white hover:brightness-95"
            >
              Install
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-lg bg-fb-active-bg px-3 py-2 text-xs font-bold text-fb-text-secondary hover:bg-fb-divider"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
