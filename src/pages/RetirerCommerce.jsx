import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Store } from 'lucide-react';
import { retirerCommerce } from '../lib/api';
import usePageMeta from '../hooks/usePageMeta';

export default function RetirerCommerce() {
  usePageMeta('Retirer un commerce');
  const [searchParams] = useSearchParams();
  const commerceId = searchParams.get('id');
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isValid = commerceId && token;

  async function handleRetrait() {
    if (!confirmed) { setConfirmed(true); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await retirerCommerce(commerceId, token);
      if (result) {
        setSuccess(true);
      } else {
        setError('Commerce introuvable ou déjà retiré du réseau.');
      }
    } catch {
      setError('Une erreur est survenue. Contactez-nous.');
    } finally {
      setLoading(false);
    }
  }

  if (!isValid) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <h1 className="font-serif text-3xl font-bold text-texte mb-4">Lien invalide</h1>
          <p className="text-gray-600 mb-8">Ce lien de retrait est incomplet ou incorrect. Contactez-nous si vous souhaitez quitter le réseau.</p>
          <Link to="/" className="px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 md:p-16 shadow-xl border border-gray-100 max-w-lg w-full text-center mx-4">
          <div className="w-20 h-20 rounded-full bg-green-100 text-vert flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="font-serif text-3xl font-bold text-texte mb-4">Commerce retiré</h2>
          <p className="text-gray-600 mb-8">
            Votre commerce a été retiré du réseau Réseaux-Résident. Il n'apparaîtra plus sur le site.
            Vous pouvez nous recontacter à tout moment pour revenir.
          </p>
          <Link to="/" className="px-8 py-4 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors inline-block">
            Retour à l'accueil
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
      <div className="max-w-lg mx-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-orange-500 to-red-500 p-8 text-white text-center">
            <Store size={40} className="mx-auto mb-4" />
            <h1 className="font-serif text-3xl font-bold mb-2">Quitter le réseau</h1>
            <p className="text-orange-100">Retirer votre commerce du programme Réseaux-Résident</p>
          </div>

          <div className="p-8 space-y-6">
            <p className="text-gray-600 leading-relaxed">
              En vous retirant du réseau, votre commerce ne sera plus visible sur le site et les porteurs de carte ne bénéficieront plus d'avantages chez vous.
            </p>

            {confirmed && !error && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-orange-800">
                  <strong>Confirmation requise.</strong> Cliquez à nouveau pour confirmer le retrait définitif.
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
            )}

            <button onClick={handleRetrait} disabled={loading}
              className={`w-full py-4 font-bold rounded-xl transition-colors ${
                confirmed ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
              } disabled:opacity-50`}>
              {loading ? 'Traitement...' : confirmed ? 'Confirmer le retrait' : 'Je souhaite quitter le réseau'}
            </button>

            <Link to="/" className="block text-center text-gray-500 hover:text-bleu text-sm font-medium transition-colors">
              Annuler et revenir à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
