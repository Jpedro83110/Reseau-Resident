import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWA';

const DISMISS_KEY = 'rr-install-dismissed';

export default function InstallBanner() {
  const { canInstall, isIOS, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [showIOSTip, setShowIOSTip] = useState(false);

  // Ne pas afficher si installé, dismissé, ou pas installable
  if (isInstalled || dismissed || (!canInstall && !isIOS)) return null;

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm">
      <div className="bg-bleu text-white rounded-2xl p-4 shadow-2xl border border-white/10 flex items-start gap-3">
        <div className="p-2 bg-or/20 rounded-xl shrink-0">
          <Download size={20} className="text-or-clair" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm mb-1">Installez Réseaux-Résident</p>
          <p className="text-xs text-blue-200 leading-relaxed">
            Accès rapide depuis votre écran d'accueil, comme une application.
          </p>
          {canInstall && (
            <div className="flex gap-2 mt-3">
              <button onClick={install}
                className="flex-1 px-4 py-2 bg-or hover:bg-or-clair text-white text-sm font-bold rounded-xl transition-colors">
                Installer
              </button>
              <button onClick={handleDismiss}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors">
                Plus tard
              </button>
            </div>
          )}
          {isIOS && !showIOSTip && (
            <button onClick={() => setShowIOSTip(true)}
              className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-colors w-full">
              Comment installer ?
            </button>
          )}
          {isIOS && showIOSTip && (
            <div className="mt-3 bg-white/10 rounded-xl p-3 text-xs text-blue-100 space-y-1">
              <p className="flex items-center gap-2"><Share size={14} /> Appuyez sur le bouton Partager</p>
              <p>Puis "Sur l'écran d'accueil"</p>
            </div>
          )}
        </div>
        <button onClick={handleDismiss} className="p-1 text-white/50 hover:text-white transition-colors shrink-0" aria-label="Fermer">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
