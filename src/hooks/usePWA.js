import { useState, useEffect } from 'react';

let deferredPrompt = null;

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check iOS Safari
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    setIsIOS(ios && !standalone);

    // Android / Chrome
    function handlePrompt(e) {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    }
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  async function install() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    return outcome === 'accepted';
  }

  return { canInstall, isIOS, install };
}
