import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import usePageMeta from '../../hooks/usePageMeta';

export default function SupprimerCompte() {
  usePageMeta('Supprimer mon compte');
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();

  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isConfirmed = confirmation === 'SUPPRIMER';

  async function handleDelete() {
    if (!isConfirmed || !user) return;
    setLoading(true);
    setError(null);

    try {
      const userId = user.id;
      const email = user.email;

      // Supprimer les donnees liees (ordre important pour les FK)
      // On ignore les erreurs si les tables n'existent pas
      await supabase.from('favoris').delete().eq('profile_id', userId);
      await supabase.from('notifications').delete().eq('destinataire_id', userId);
      await supabase.from('soutiens').delete().eq('soutien_id', userId);
      await supabase.from('utilisations_offres').delete().eq('profile_id', userId);

      // Supprimer les profils de role
      await supabase.from('commercant_profiles').delete().eq('id', userId);
      await supabase.from('association_profiles').delete().eq('id', userId);
      await supabase.from('mairie_profiles').delete().eq('id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      // Supprimer les cartes
      if (email) {
        await supabase.from('cartes').delete().eq('email', email);
      }

      // Deconnecter
      await signOut();

      // Rediriger vers l'accueil
      navigate('/?compte-supprime=1');
    } catch (err) {
      console.error('Erreur suppression:', err);
      setError('Une erreur est survenue lors de la suppression. Contactez le support.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-texte mb-2">Supprimer mon compte</h1>
          <p className="text-gray-500 text-sm">Cette action est irréversible.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-red-700 text-sm mb-2 flex items-center gap-2">
              <AlertTriangle size={16} /> Attention
            </h3>
            <ul className="text-red-600 text-xs space-y-1">
              <li>Votre profil et vos données seront définitivement supprimés</li>
              <li>Vos cartes résident seront désactivées</li>
              <li>Vos favoris, badges et points seront perdus</li>
              <li>Cette action ne peut pas être annulée</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tapez <span className="text-red-600 font-mono">SUPPRIMER</span> pour confirmer
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all text-base bg-white"
              placeholder="SUPPRIMER"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Suppression en cours...</>
            ) : (
              <><Trash2 size={18} /> Supprimer définitivement mon compte</>
            )}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full mt-3 py-3 text-gray-500 hover:text-texte font-medium rounded-xl transition-colors text-sm"
          >
            Annuler et revenir en arrière
          </button>
        </div>
      </div>
    </div>
  );
}
