import { useState, useEffect } from 'react';

let deferredPrompt = null;

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Détecter si l'app est déjà installée (standalone)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    setIsInstalled(!!standalone);

    // Détecter iOS Safari (pas encore installé)
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(ios && !standalone);

    // Android / Chrome — beforeinstallprompt
    function handlePrompt(e) {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    }

    // Écouter l'événement d'installation réussie
    function handleInstalled() {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome === 'accepted';
  }

  return { canInstall, isIOS, isInstalled, install };
}
