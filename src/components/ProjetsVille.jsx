// src/components/ProjetsVille.jsx
// Affichage des projets locaux pour les résidents avec possibilité de soutenir
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Heart, Target, ChevronDown, ChevronUp, Building2,
  Calendar, X, Check, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

// ── Modal de soutien ──────────────────────────────────────────
function SoutienModal({ projet, onClose, onSoutenir }) {
  const [montant, setMontant] = useState('');
  const [message, setMessage] = useState('');
  const [anonyme, setAnonyme] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const paliersSuggeres = projet.paliers
    ? projet.paliers.map((p) => p.montant)
    : [5, 10, 25, 50];

  async function handleSubmit() {
    const montantNum = parseFloat(montant);
    if (!montantNum || montantNum <= 0) return;
    try {
      setIsSaving(true);
      const { error } = await supabase.from('soutiens').insert({
        projet_id: projet.id,
        soutien_type: 'resident',
        soutien_id: (await supabase.auth.getUser()).data.user.id,
        montant: montantNum,
        message: message.trim() || null,
        anonyme,
      });
      if (error) throw error;
      setSuccess(true);
      onSoutenir(projet.id, montantNum);
      setTimeout(onClose, 1500);
    } catch (err) {
      console.error('Erreur soutien:', err);
    } finally {
      setIsSaving(false);
    }
  }

  // Fermer avec Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Soutenir le projet">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-vert/10 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-vert" />
            </div>
            <h3 className="font-serif text-xl font-bold text-texte mb-2">Merci pour votre soutien !</h3>
            <p className="text-sm text-gray-500">Votre contribution a été enregistrée.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-texte">Soutenir ce projet</h3>
                <p className="text-sm text-gray-500 mt-0.5">{projet.titre}</p>
              </div>
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Montants suggérés */}
            <div className="flex flex-wrap gap-2 mb-4">
              {paliersSuggeres.map((val) => (
                <button
                  key={val}
                  onClick={() => setMontant(String(val))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    montant === String(val)
                      ? 'bg-bleu text-white border-bleu'
                      : 'border-gray-200 text-gray-700 hover:border-bleu/40'
                  }`}
                >
                  {val}€
                </button>
              ))}
            </div>

            {/* Montant libre */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant personnalisé (€)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none"
                placeholder="Montant en euros"
              />
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Message (optionnel)</label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none"
                placeholder="Encouragez l'association..."
              />
            </div>

            {/* Anonyme */}
            <label className="flex items-center gap-2 mb-5 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                checked={anonyme}
                onChange={(e) => setAnonyme(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-bleu focus:ring-bleu"
              />
              Soutien anonyme
            </label>

            <button
              onClick={handleSubmit}
              disabled={isSaving || !montant || parseFloat(montant) <= 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-vert text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSaving
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Heart size={16} />}
              Soutenir avec {montant || '...'}€
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// ── Carte Projet Public ───────────────────────────────────────
function ProjetPublicCard({ projet, onSoutenir }) {
  const [ouvert, setOuvert] = useState(false);

  const progression = projet.objectif_montant > 0
    ? Math.min(100, Math.round(((projet.montant_collecte ?? 0) / projet.objectif_montant) * 100))
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-bleu/20 transition-all">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {projet.associations && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Building2 size={11} />
              {projet.associations.nom}
            </span>
          )}
          {projet.date_limite && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={11} />
              Jusqu'au {new Date(projet.date_limite).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-texte mb-1">{projet.titre}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{projet.description}</p>

        {/* Progression */}
        {projet.objectif_montant && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="flex items-center gap-1 font-medium text-vert">
                <TrendingUp size={12} />
                {projet.montant_collecte ?? 0}€
              </span>
              <span>objectif : {projet.objectif_montant}€</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-vert rounded-full transition-all" style={{ width: `${progression ?? 0}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Paliers toggle */}
          {projet.paliers && projet.paliers.length > 0 && (
            <button
              onClick={() => setOuvert(!ouvert)}
              className="flex items-center gap-1 text-xs font-medium text-bleu hover:text-bleu-clair transition-colors"
            >
              {ouvert ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {projet.paliers.length} palier{projet.paliers.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => onSoutenir(projet)}
            className="flex items-center gap-1.5 px-4 py-2 bg-vert text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors ml-auto"
          >
            <Heart size={14} />
            Soutenir
          </button>
        </div>
      </div>

      <AnimatePresence>
        {ouvert && projet.paliers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 space-y-1.5">
              {projet.paliers.map((palier, i) => {
                const atteint = (projet.montant_collecte ?? 0) >= palier.montant;
                return (
                  <div key={i} className={`flex items-center gap-3 ${atteint ? 'text-vert' : 'text-gray-600'}`}>
                    <Target size={13} className={atteint ? 'text-vert' : 'text-gray-300'} />
                    <span className="w-16 text-sm font-bold shrink-0">{palier.montant}€</span>
                    <span className="text-sm">{palier.description}</span>
                    {atteint && <Check size={13} className="ml-auto text-vert" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function ProjetsVille({ villeId }) {
  const { user } = useAuth();
  const [projets, setProjets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projetSoutien, setProjetSoutien] = useState(null);

  useEffect(() => {
    if (!villeId) return;
    async function charger() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('projets')
          .select('id, titre, description, objectif_montant, montant_collecte, paliers, date_limite, statut, associations(nom)')
          .eq('ville_id', villeId)
          .in('statut', ['actif', 'atteint'])
          .order('created_at', { ascending: false })
          .limit(6);
        if (error) throw error;
        setProjets(data ?? []);
      } catch (err) {
        console.error('Erreur chargement projets ville:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [villeId]);

  function handleSoutenir(projetId, montant) {
    setProjets((prev) =>
      prev.map((p) =>
        p.id === projetId
          ? { ...p, montant_collecte: (p.montant_collecte ?? 0) + montant }
          : p
      )
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (projets.length === 0) return null;

  return (
    <section>
      <h2 className="font-serif text-xl font-bold text-texte mb-4 flex items-center gap-2">
        <FolderOpen size={20} className="text-vert" />
        Projets locaux à soutenir
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projets.map((projet) => (
          <ProjetPublicCard
            key={projet.id}
            projet={projet}
            onSoutenir={setProjetSoutien}
          />
        ))}
      </div>

      <AnimatePresence>
        {projetSoutien && (
          <SoutienModal
            projet={projetSoutien}
            onClose={() => setProjetSoutien(null)}
            onSoutenir={handleSoutenir}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
