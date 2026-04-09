// src/pages/auth/NouveauMotDePasse.jsx
// Page de saisie du nouveau mot de passe après clic sur le lien email.
// Supabase gère la session automatiquement via les tokens dans l'URL.
//
// CONFIGURATION REQUISE CÔTÉ SUPABASE DASHBOARD :
// 1. Authentication > URL Configuration > Redirect URLs :
//    Ajouter : https://reseaux-resident.fr/nouveau-mot-de-passe
//    Ajouter : http://localhost:3000/nouveau-mot-de-passe (dev)
// 2. Authentication > Email Templates > Reset Password :
//    Vérifier que le template utilise {{ .ConfirmationURL }}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import usePageMeta from '../../hooks/usePageMeta';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base';

export default function NouveauMotDePasse() {
  usePageMeta('Nouveau mot de passe');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Vérifier que Supabase a bien récupéré la session depuis le lien email
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setError('Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande.');
      }
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        if (updateError.message.includes('same_password')) {
          setError('Le nouveau mot de passe doit être différent de l\'ancien.');
        } else {
          setError(updateError.message);
        }
        return;
      }

      setSuccess(true);
      showToast({ type: 'success', message: 'Mot de passe modifié avec succès !' });

      // Rediriger vers la connexion après 3s
      setTimeout(() => navigate('/connexion', { replace: true }), 3000);
    } catch (err) {
      console.error('Erreur reset password:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full text-center">
          <CheckCircle2 size={48} className="text-vert mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-texte mb-3">Mot de passe modifié</h2>
          <p className="text-gray-500 mb-6">Vous allez être redirigé vers la page de connexion...</p>
          <Link to="/connexion" className="inline-block px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors">
            Se connecter
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bleu/10 text-bleu mb-4">
            <KeyRound size={28} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">Nouveau mot de passe</h1>
          <p className="text-gray-500">Choisissez votre nouveau mot de passe.</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  required
                  minLength={6}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Confirmer le mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                required
                className={inputClass}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            <button type="submit" disabled={isLoading || !password || password !== confirmPassword}
              className="w-full py-3 bg-bleu hover:bg-bleu-clair disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 size={18} className="animate-spin" /> Modification...</> : 'Modifier le mot de passe'}
            </button>
          </form>
        ) : !error ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-bleu" />
            <span className="ml-3 text-gray-500">Vérification du lien...</span>
          </div>
        ) : null}

        <div className="mt-6 text-center">
          <Link to="/connexion" className="text-sm text-gray-400 hover:text-bleu transition-colors">
            Retour à la connexion
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
