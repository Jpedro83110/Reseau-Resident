import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, CheckCircle2, AlertCircle, Store, User, Loader2 } from 'lucide-react';
import { getScanContext, createVisitSecure } from '../../lib/api';

function ScanIntro() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-blue-50 text-bleu flex items-center justify-center mx-auto mb-8"><QrCode size={40} /></div>
      <h1 className="font-serif text-4xl font-bold text-texte mb-4">Scanner une Carte Résident</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto">Scannez le QR code de la carte du résident.</p>
    </div>
  );
}

function ScanInvalide({ message }) {
  const messages = {
    carte_not_found: 'Carte introuvable. Vérifiez le QR code.',
    carte_inactive: 'Cette carte est désactivée ou résiliée.',
    carte_expiree: 'Cette carte est expirée. Le porteur doit la renouveler.',
  };
  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-8"><AlertCircle size={40} /></div>
      <h2 className="font-serif text-3xl font-bold text-texte mb-4">Carte non valide</h2>
      <p className="text-xl text-gray-600 mb-8">{messages[message] || message || 'Erreur inconnue.'}</p>
      <a href="/scan" className="px-8 py-4 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors inline-block">Réessayer</a>
    </div>
  );
}

function ScanResult({ carte, commerces, qrToken }) {
  const [selectedCommerce, setSelectedCommerce] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  async function handleValider() {
    if (!selectedCommerce) return;
    setLoading(true); setError(null);
    try {
      const result = await createVisitSecure(qrToken, selectedCommerce, 'qr');
      if (result.error) {
        const errMessages = {
          doublon: 'Visite déjà enregistrée récemment pour ce commerce.',
          ville_mismatch: 'Ce commerce n\'est pas dans la ville de la carte.',
          commerce_invalide: 'Commerce invalide ou inactif.',
        };
        setError(errMessages[result.error] || result.message || result.error);
      } else {
        setSuccess(true);
      }
    } catch (err) { setError(err.message || 'Erreur'); }
    finally { setLoading(false); }
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="w-24 h-24 rounded-full bg-green-100 text-vert flex items-center justify-center mx-auto mb-8"><CheckCircle2 size={48} /></div>
        <h2 className="font-serif text-3xl font-bold text-texte mb-4">Visite enregistrée !</h2>
        <p className="text-xl text-gray-600 mb-2"><strong>{carte.prenom} {carte.nom}</strong> — {carte.numero}</p>
        <p className="text-gray-500 mb-8">Merci de votre participation au programme.</p>
        <button onClick={() => { setSuccess(false); setSelectedCommerce(''); }}
          className="px-8 py-4 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors">Scanner une autre carte</button>
      </motion.div>
    );
  }

  const expDate = new Date(carte.date_expiration);

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-green-100 text-vert flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
        <h2 className="font-serif text-3xl font-bold text-texte mb-2">Carte valide</h2>
      </div>
      <div className="bg-gradient-to-br from-bleu to-[#0d2440] rounded-2xl p-6 text-white mb-8">
        <div className="flex items-center gap-3 mb-4"><User size={20} className="text-or-clair" /><span className="text-lg font-bold">{carte.prenom} {carte.nom}</span></div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="text-blue-300 text-xs uppercase tracking-wider mb-1">Numéro</div><div className="font-mono font-bold">{carte.numero}</div></div>
          <div><div className="text-blue-300 text-xs uppercase tracking-wider mb-1">Formule</div><div className="font-bold capitalize">{carte.formule}</div></div>
          <div><div className="text-blue-300 text-xs uppercase tracking-wider mb-1">Ville</div><div className="font-bold">{carte.ville_nom}</div></div>
          <div><div className="text-blue-300 text-xs uppercase tracking-wider mb-1">Expiration</div><div className="font-bold text-green-300">{expDate.toLocaleDateString('fr-FR')}</div></div>
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-3"><Store size={16} className="inline mr-2 text-or" />Votre commerce *</label>
        <select value={selectedCommerce} onChange={(e) => setSelectedCommerce(e.target.value)}
          className="w-full px-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-or focus:ring-4 focus:ring-or/20 outline-none bg-white">
          <option value="" disabled>Sélectionnez votre commerce</option>
          {(commerces || []).map((c) => <option key={c.id} value={c.id}>{c.nom} — {c.categorie}</option>)}
        </select>
      </div>
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">{error}</div>}
      <button onClick={handleValider} disabled={!selectedCommerce || loading}
        className="w-full py-5 bg-or hover:bg-or-clair disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xl font-bold rounded-xl transition-colors shadow-lg">
        {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={22} className="animate-spin" /> Enregistrement...</span> : 'Valider la visite'}
      </button>
    </div>
  );
}

export default function Scan() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [errorType, setErrorType] = useState(null);

  useEffect(() => {
    if (!token) return;
    let c = false;
    setLoading(true);
    getScanContext(token).then((data) => {
      if (c) return;
      if (data.error) setErrorType(data.error);
      else setContext(data);
    }).catch(() => { if (!c) setErrorType('carte_not_found'); })
    .finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, [token]);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
          {loading ? <div className="flex flex-col items-center justify-center py-16"><div className="w-12 h-12 border-4 border-or border-t-transparent rounded-full animate-spin mb-4" /><p className="text-gray-500">Vérification...</p></div>
           : errorType ? <ScanInvalide message={errorType} />
           : context ? <ScanResult carte={context.carte} commerces={context.commerces} qrToken={token} />
           : <ScanIntro />}
        </div>
      </div>
    </div>
  );
}
