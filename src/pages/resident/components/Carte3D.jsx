// src/pages/resident/components/Carte3D.jsx
// Carte digitale 3D interactive avec tilt, reflet et flip pour QR code
import { useState, useEffect, useRef, useCallback } from 'react';
import { Wallet, Smartphone } from 'lucide-react';

export default function Carte3D({ ville, numero, expiration, prenom, nom, formule, qrToken }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUri, setQrDataUri] = useState(null);
  const cardRef = useRef(null);

  // Générer le QR code
  useEffect(() => {
    if (!qrToken) return;
    const scanUrl = `${window.location.origin}/scan?token=${qrToken}`;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(scanUrl, { width: 280, margin: 2, color: { dark: '#1a3a5c', light: '#ffffff' } })
        .then(setQrDataUri).catch((err) => console.error('Erreur génération QR:', err));
    }).catch((err) => console.error('Erreur import QRCode:', err));
  }, [qrToken]);

  const handleMove = useCallback((clientX, clientY) => {
    const el = cardRef.current;
    if (!el || isFlipped) return;
    const rect = el.getBoundingClientRect();
    const x = (clientY - rect.top - rect.height / 2) / 12;
    const y = -(clientX - rect.left - rect.width / 2) / 12;
    const mx = ((clientX - rect.left) / rect.width) * 100;
    const my = ((clientY - rect.top) / rect.height) * 100;
    setTilt({ x: Math.max(-15, Math.min(15, x)), y: Math.max(-15, Math.min(15, y)) });
    setMousePos({ x: mx, y: my });
  }, [isFlipped]);

  const handleMouseMove = (e) => handleMove(e.clientX, e.clientY);
  const handleTouchMove = (e) => {
    const t = e.touches[0];
    if (t) handleMove(t.clientX, t.clientY);
  };
  const handleLeave = () => { setTilt({ x: 0, y: 0 }); setMousePos({ x: 50, y: 50 }); };

  const formuleLabel = { individuel: 'Individuel', couple: 'Couple', famille: 'Famille', secondaire: 'Secondaire' };

  return (
    <div className="flex justify-center">
      <div
        ref={cardRef}
        className="relative cursor-pointer select-none"
        style={{ perspective: '1000px', width: '100%', maxWidth: 380, aspectRatio: '85.6 / 54' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleLeave}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Retourner la carte' : 'Voir le QR code'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsFlipped(!isFlipped); }}
      >
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)${isFlipped ? ' rotateY(180deg)' : ''}`,
            transition: isFlipped ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 0.1s ease-out',
          }}
        >
          {/* ─── FACE AVANT ─── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Fond dégradé */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0d2440] via-[#1a3a5c] to-[#2a5298]" />

            {/* Motif géométrique */}
            <div className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: 'repeating-linear-gradient(30deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)',
              }}
            />

            {/* Reflet lumineux qui suit le curseur */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.25) 0%, transparent 55%)`,
              }}
            />

            {/* Particules scintillantes */}
            <div className="absolute top-4 right-8 w-1 h-1 bg-white/40 rounded-full animate-pulse" />
            <div className="absolute top-12 right-16 w-0.5 h-0.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-8 right-6 w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-8 left-[60%] w-0.5 h-0.5 bg-or-clair/40 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />

            {/* Contenu */}
            <div className="relative z-10 h-full flex flex-col justify-between p-5 text-white">
              <div className="flex justify-between items-start">
                <div className="font-serif text-base font-bold tracking-wider opacity-90">Réseaux-Résident</div>
                <div className="text-[9px] font-medium uppercase tracking-widest opacity-60 text-right max-w-[100px]">{ville}</div>
              </div>

              <div>
                <div className="w-10 h-7 rounded bg-gradient-to-br from-[#e8b86d] to-[#c8963e] shadow-inner mb-3" />
              </div>

              <div>
                <div className="font-mono text-lg tracking-[0.18em] mb-1 text-white/90">{numero}</div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-sm font-medium">{prenom} {nom}</div>
                    <div className="text-[10px] text-blue-200 mt-0.5">Exp. {expiration}</div>
                  </div>
                  <div className="px-2 py-0.5 bg-white/10 rounded-full text-[9px] font-bold uppercase tracking-wider border border-white/20">
                    {formuleLabel[formule] || formule}
                  </div>
                </div>
              </div>
            </div>

            {/* Bordure subtile */}
            <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />
          </div>

          {/* ─── FACE ARRIÈRE ─── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#0d2440] to-[#1a3a5c]" />
            <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />

            <div className="relative z-10 h-full flex flex-col items-center justify-center p-5 text-white">
              {qrDataUri ? (
                <>
                  <div className="bg-white p-3 rounded-xl shadow-lg mb-3">
                    <img src={qrDataUri} alt="QR Code" className="w-32 h-32" />
                  </div>
                  <p className="text-xs text-blue-200 font-medium uppercase tracking-wider mb-1">Scannez pour valider</p>
                  <p className="text-[10px] text-blue-300/60">Exp. {expiration}</p>
                </>
              ) : (
                <p className="text-sm text-blue-200">QR code indisponible</p>
              )}
              <p className="absolute bottom-3 text-[8px] text-white/30 tracking-widest uppercase">Réseaux-Résident</p>
            </div>
          </div>
        </div>

        {/* Indicateur flip */}
        <p className="text-center text-[10px] text-gray-400 mt-2">
          {isFlipped ? 'Cliquez pour retourner' : 'Cliquez pour voir le QR code'}
        </p>

        {/* Boutons Wallet */}
        {qrToken && (
          <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Generer un fichier .pkpass simplifie (lien vers la page scan)
                const scanUrl = `${window.location.origin}/scan?token=${qrToken}`;
                const walletData = {
                  formatVersion: 1,
                  passTypeIdentifier: 'pass.fr.reseaux-resident',
                  serialNumber: numero,
                  description: `Carte Résident ${ville}`,
                  organizationName: 'Réseaux-Résident',
                  foregroundColor: 'rgb(255, 255, 255)',
                  backgroundColor: 'rgb(26, 58, 92)',
                  barcode: { message: scanUrl, format: 'PKBarcodeFormatQR', messageEncoding: 'iso-8859-1' },
                };
                // Copier le lien QR dans le presse-papier comme fallback
                navigator.clipboard?.writeText(scanUrl);
                alert(`Lien de votre carte copié !\n\nPour ajouter à Apple Wallet : l'intégration complète nécessite un certificat Apple Developer.\n\nEn attendant, ajoutez ce lien en raccourci sur votre écran d'accueil :\n${scanUrl}`);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Wallet size={16} />
              Ajouter à Apple Wallet
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const scanUrl = `${window.location.origin}/scan?token=${qrToken}`;
                navigator.clipboard?.writeText(scanUrl);
                alert(`Lien de votre carte copié !\n\nPour ajouter à Google Wallet : l'intégration complète nécessite un compte Google Pay API.\n\nEn attendant, ajoutez ce lien en raccourci sur votre écran d'accueil :\n${scanUrl}`);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-texte border border-gray-200 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Smartphone size={16} />
              Ajouter à Google Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
