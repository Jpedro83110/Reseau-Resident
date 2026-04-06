// src/pages/auth/CompleterProfil.jsx
// Page affichée quand un utilisateur authentifié n'a aucun rôle (pas de ligne dans profiles)
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base';

export default function CompleterProfil() {
  const { user, roles } = useAuthContext();
  const navigate = useNavigate();
  usePageMeta('Compléter mon profil');

  const [prenom, setPrenom] = useState(user?.user_metadata?.prenom || '');
  const [nom, setNom] = useState(user?.user_metadata?.nom || '');
  const [villeId, setVilleId] = useState('');
  const [villes, setVilles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Si l'utilisateur a déjà un rôle, rediriger
  useEffect(() => {
    if (roles.length > 0) navigate('/mon-espace', { replace: true });
  }, [roles, navigate]);

  // Charger les villes
  useEffect(() => {
    supabase.from('villes').select('id, nom, departement').eq('statut', 'actif').order('nom')
      .then(({ data }) => { if (data) setVilles(data); });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prenom.trim() || prenom.trim().length < 2) {
      setError('Le prénom doit contenir au moins 2 caractères.');
      return;
    }
    if (!nom.trim() || nom.trim().length < 2) {
      setError('Le nom doit contenir au moins 2 caractères.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        ville_id: villeId || null,
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: user.email,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          // Profil déjà existant — forcer un refresh
          navigate('/mon-espace', { replace: true });
          return;
        }
        throw insertError;
      }

      // Forcer un refresh du contexte auth en rechargeant la page
      window.location.href = '/mon-espace';
    } catch (err) {
      console.error('Erreur création profil:', err);
      setError('Erreur lors de la création du profil. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bleu/10 text-bleu mb-4">
            <UserPlus size={28} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">
            Bienvenue !
          </h1>
          <p className="text-gray-500">
            Pour accéder à votre espace, complétez votre profil résident.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cp-prenom" className="block text-sm font-bold text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                id="cp-prenom"
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Marie"
                required
                minLength={2}
                autoComplete="given-name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="cp-nom" className="block text-sm font-bold text-gray-700 mb-2">
                Nom *
              </label>
              <input
                id="cp-nom"
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                required
                minLength={2}
                autoComplete="family-name"
                className={inputClass}
              />
            </div>
          </div>

          {villes.length > 0 && (
            <div>
              <label htmlFor="cp-ville" className="block text-sm font-bold text-gray-700 mb-2">
                Votre ville
              </label>
              <select
                id="cp-ville"
                value={villeId}
                onChange={(e) => setVilleId(e.target.value)}
                className={inputClass}
              >
                <option value="">Sélectionner une ville…</option>
                {villes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom} ({v.departement})
                  </option>
                ))}
              </select>
            </div>
          )}

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
            {isLoading ? 'Création...' : 'Compléter mon profil'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
