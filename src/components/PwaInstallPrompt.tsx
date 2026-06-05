import { Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'finance-os-install-dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');
  const ios = isIos();

  useEffect(() => {
    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setInstallEvent(null);
      setDismissed(true);
      localStorage.setItem(DISMISS_KEY, 'true');
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (dismissed || isStandalone() || (!installEvent && !ios)) return null;

  async function install() {
    if (ios) {
      setShowIosHelp(true);
      return;
    }
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallEvent(null);
    }
  }

  function dismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  }

  return (
    <aside className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-lg border border-line bg-white p-4 shadow-xl sm:bottom-5 sm:left-auto sm:right-5 sm:w-96 lg:bottom-5">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
        aria-label="Dismiss install prompt"
      >
        <X size={18} />
      </button>
      <div className="pr-10">
        <p className="font-semibold text-ink">Install Finance OS</p>
        <p className="mt-1 text-sm text-slate-600">Open your finance dashboard faster in a standalone app window.</p>
      </div>
      {showIosHelp ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <p className="flex items-center gap-2 font-medium"><Share2 size={17} /> In Safari, tap Share.</p>
          <p className="mt-2">Then choose <strong>Add to Home Screen</strong> and tap <strong>Add</strong>.</p>
        </div>
      ) : (
        <Button type="button" className="mt-4 w-full" onClick={install}>
          <Download size={18} />
          Install app
        </Button>
      )}
    </aside>
  );
}
