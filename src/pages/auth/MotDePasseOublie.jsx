// src/pages/auth/MotDePasseOublie.jsx
// Page de réinitialisation du mot de passe via Supabase Auth
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base';

export default function MotDePasseOublie() {
  usePageMeta('Mot de passe oublié');

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${appUrl}/nouveau-mot-de-passe` }
      );

      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      // Ne pas révéler si l'email existe ou non
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4 text-center"
        >
          <CheckCircle2 size={48} className="text-vert mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-texte mb-3">
            Email envoyé
          </h2>
          <p className="text-gray-500 mb-6">
            Si un compte existe avec l'adresse <strong>{email}</strong>,
            vous recevrez un lien de réinitialisation dans quelques minutes.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Pensez à vérifier votre dossier spam.
          </p>
          <Link
            to="/connexion"
            className="inline-block px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors"
          >
            Retour à la connexion
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4"
      >
        <Link
          to="/connexion"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-bleu transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Retour à la connexion
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bleu/10 text-bleu mb-4">
            <KeyRound size={28} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-gray-500">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
