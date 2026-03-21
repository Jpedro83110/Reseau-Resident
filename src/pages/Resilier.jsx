import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, CheckCircle2, CreditCard, Mail } from 'lucide-react';
import { resilierCarte } from '../lib/api';

export default function Resilier() {
  const [numero, setNumero] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!confirmStep) { setConfirmStep(true); return; }

    setLoading(true);
    setError(null);
    try {
      const result = await resilierCarte(numero.trim().toUpperCase(), email.trim().toLowerCase());
      if (result) {
        setSuccess(true);
      } else {
        setError('Aucune carte active trouvée avec ce numéro et cet email. Vérifiez vos informations.');
      }
    } catch {
      setError('Une erreur est survenue. Réessayez ou contactez-nous.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none transition-all text-base bg-white";

  if (success) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 md:p-16 shadow-xl border border-gray-100 max-w-lg w-full text-center mx-4">
          <div className="w-20 h-20 rounded-full bg-green-100 text-vert flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="font-serif text-3xl font-bold text-texte mb-4">Carte résiliée</h2>
          <p className="text-gray-600 mb-4">
            Votre Carte Résident <strong>{numero}</strong> a été désactivée. Elle ne sera plus acceptée chez les commerçants partenaires.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Aucun remboursement n'est effectué pour la période restante. Vous pouvez souscrire une nouvelle carte à tout moment.
          </p>
          <Link to="/" className="inline-flex items-center justify-center px-8 py-4 font-bold rounded-xl text-white bg-bleu hover:bg-bleu-clair transition-colors">
            Retour à l'accueil
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-bleu font-medium mb-8 transition-colors">
          <ArrowLeft size={20} /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-8 text-white text-center">
            <h1 className="font-serif text-3xl font-bold mb-2">Résilier ma carte</h1>
            <p className="text-red-100">Cette action est définitive et irréversible.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label htmlFor="numero" className="block text-sm font-bold text-gray-700 mb-2">
                <CreditCard size={16} className="inline mr-2 text-gray-400" />
                Numéro de carte *
              </label>
              <input id="numero" type="text" value={numero}
                onChange={(e) => { setNumero(e.target.value); setConfirmStep(false); }}
                className={inputClass} required placeholder="Ex : SAN-123456"
                style={{ textTransform: 'uppercase' }} />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                <Mail size={16} className="inline mr-2 text-gray-400" />
                Email utilisé à l'inscription *
              </label>
              <input id="email" type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setConfirmStep(false); }}
                className={inputClass} required placeholder="marie@exemple.fr" />
            </div>

            {confirmStep && !error && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <strong>Êtes-vous sûr ?</strong> Votre carte sera définitivement désactivée. Les commerçants ne pourront plus la scanner. Cliquez à nouveau pour confirmer.
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
            )}

            <button type="submit" disabled={loading || !numero || !email}
              className={`w-full py-4 font-bold rounded-xl transition-colors ${
                confirmStep
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}>
              {loading ? 'Traitement...' : confirmStep ? 'Confirmer la résiliation' : 'Résilier ma carte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
