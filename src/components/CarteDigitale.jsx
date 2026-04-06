import { useState, useEffect } from 'react';

export default function CarteDigitale({ ville, numero, expiration, prenom, nom, formule, qrToken }) {
  const scanUrl = qrToken ? `${window.location.origin}/scan?token=${qrToken}` : null;
  const [qrDataUri, setQrDataUri] = useState(null);

  useEffect(() => {
    if (!scanUrl) return;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(scanUrl, { width: 200, margin: 2, color: { dark: '#1a3a5c', light: '#ffffff' } })
        .then(setQrDataUri).catch((err) => console.error('Erreur génération QR:', err));
    }).catch((err) => console.error('Erreur import QRCode:', err));
  }, [scanUrl]);

  return (
    <div className="w-[340px] mx-auto">
      <div className="rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#0d2440] border border-white/10 text-white">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div className="font-serif text-xl font-bold tracking-wider">Réseaux-Résident</div>
            <div className="text-[10px] font-medium uppercase tracking-widest opacity-80 text-right">{ville}</div>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-9 rounded bg-gradient-to-br from-[#e8b86d] to-[#c8963e] shadow-inner" />
            <div className="text-sm text-blue-200 capitalize">{formule}</div>
          </div>
          <div className="font-mono text-xl tracking-[0.18em] mb-1">{numero}</div>
          <div className="text-sm text-blue-200">{prenom} {nom}</div>
        </div>
        {qrDataUri && (
          <div className="bg-white mx-4 mb-4 rounded-xl p-4 flex items-center gap-4">
            <img src={qrDataUri} alt="QR Code" className="w-24 h-24 rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Scanner pour valider</div>
              <p className="text-xs text-gray-500 leading-relaxed">Présentez ce QR code au commerçant pour enregistrer votre visite.</p>
            </div>
          </div>
        )}
        <div className="px-6 pb-5 flex justify-between items-end">
          <div className="text-[10px] uppercase tracking-wider text-white/60">
            Valable jusqu'au<br />
            <span className="text-sm text-white font-medium">{expiration}</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
