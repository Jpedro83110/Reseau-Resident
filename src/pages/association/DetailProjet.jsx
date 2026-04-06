// src/pages/association/DetailProjet.jsx
// Vue complète d'un projet associatif avec paliers, soutiens et actions propriétaire.
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, TrendingUp, Users, Target, Heart,
  CheckCircle2, Circle, Lock, Edit3, XCircle, Image as ImageIcon,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

const STATUTS = {
  brouillon: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-600' },
  actif:     { label: 'Actif',     bg: 'bg-emerald-50', text: 'text-emerald-700' },
  atteint:   { label: 'Objectif atteint', bg: 'bg-blue-50', text: 'text-blue-700' },
  cloture:   { label: 'Clôturé',   bg: 'bg-red-50', text: 'text-red-600' },
};

export default function DetailProjet() {
  const { id } = useParams();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  usePageMeta('Détail du projet');

  const [projet, setProjet] = useState(null);
  const [association, setAssociation] = useState(null);
  const [soutiens, setSoutiens] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function charger() {
      try {
        setIsLoading(true);

        // 1. Charger le projet
        const { data: projetData, error: projetError } = await supabase
          .from('projets')
          .select('id, association_id, ville_id, titre, description, objectif_montant, montant_collecte, objectif_description, paliers, image_url, date_limite, statut, source, created_at, updated_at')
          .eq('id', id)
          .maybeSingle();

        if (projetError) throw projetError;
        if (!projetData) { setError('Projet introuvable.'); return; }

        setProjet(projetData);

        // 2. Charger association + soutiens en parallèle
        const [assoRes, soutiensRes] = await Promise.all([
          supabase
            .from('associations')
            .select('id, nom, categorie, logo_url')
            .eq('id', projetData.association_id)
            .maybeSingle(),
          supabase
            .from('soutiens')
            .select('id, montant, message, anonyme, soutien_type, soutien_id, created_at')
            .eq('projet_id', id)
            .order('created_at', { ascending: false }),
        ]);

        if (assoRes.data) setAssociation(assoRes.data);
        setSoutiens(soutiensRes.data ?? []);

        // 3. Vérifier si l'utilisateur est propriétaire
        if (user) {
          const { data: profil } = await supabase
            .from('association_profiles')
            .select('association_id')
            .eq('id', user.id)
            .maybeSingle();
          setIsOwner(profil?.association_id === projetData.association_id);
        }
      } catch (err) {
        setError('Erreur lors du chargement du projet.');
        console.error('Erreur DetailProjet:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [id, user]);

  async function handleCloturer() {
    if (!window.confirm('Êtes-vous sûr de vouloir clôturer ce projet ?')) return;
    const { error: updateError } = await supabase
      .from('projets')
      .update({ statut: 'cloture' })
      .eq('id', id);
    if (!updateError) {
      setProjet((prev) => ({ ...prev, statut: 'cloture' }));
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !projet) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-4">
          <p className="text-red-600 font-medium">{error ?? 'Projet introuvable.'}</p>
          <Link to="/mon-association" className="mt-4 inline-block px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-sm">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const statut = STATUTS[projet.statut] ?? STATUTS.brouillon;
  const progression = projet.objectif_montant > 0
    ? Math.min(100, Math.round(((projet.montant_collecte ?? 0) / projet.objectif_montant) * 100))
    : 0;
  const paliers = projet.paliers ?? [];
  const montantCollecte = projet.montant_collecte ?? 0;

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Retour */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-texte mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* ── Image hero ── */}
          {projet.image_url ? (
            <div className="h-56 md:h-72 rounded-2xl overflow-hidden mb-6 shadow-sm">
              <img src={projet.image_url} alt={projet.titre} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </div>
          ) : (
            <div className="h-36 rounded-2xl bg-gradient-to-br from-bleu/10 to-bleu/5 flex items-center justify-center mb-6">
              <ImageIcon size={40} className="text-bleu/20" />
            </div>
          )}

          {/* ── Badge + date ── */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statut.bg} ${statut.text}`}>
              {statut.label}
            </span>
            {projet.date_limite && (
              <span className="text-sm text-gray-400 flex items-center gap-1.5">
                <Calendar size={14} />
                Jusqu'au {new Date(projet.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* ── Titre ── */}
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-texte mb-2">
            {projet.titre}
          </h1>

          {/* ── Association ── */}
          {association && (
            <div className="flex items-center gap-3 mb-6">
              {association.logo_url ? (
                <img src={association.logo_url} alt={association.nom} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-bleu/10 flex items-center justify-center">
                  <Users size={14} className="text-bleu" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-texte">{association.nom}</p>
                <p className="text-xs text-gray-400">{association.categorie}</p>
              </div>
            </div>
          )}

          {/* ── Description ── */}
          <p className="text-gray-600 whitespace-pre-line leading-relaxed mb-8">
            {projet.description}
          </p>

          {/* ── Barre de progression ── */}
          {projet.objectif_montant > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <p className="text-2xl font-bold text-texte">
                    {montantCollecte.toLocaleString('fr-FR')}€
                  </p>
                  <p className="text-xs text-gray-400">collectés sur {projet.objectif_montant.toLocaleString('fr-FR')}€</p>
                </div>
                <span className={`text-lg font-bold ${progression >= 100 ? 'text-vert' : 'text-bleu'}`}>
                  {progression}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progression}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${progression >= 100 ? 'bg-vert' : 'bg-bleu'}`}
                />
              </div>
              {projet.objectif_description && (
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <Target size={14} className="text-bleu shrink-0" />
                  {projet.objectif_description}
                </p>
              )}
            </div>
          )}

          {/* ── Paliers ── */}
          {paliers.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h2 className="font-semibold text-texte flex items-center gap-2 mb-5">
                <Target size={18} className="text-bleu" />
                Paliers de soutien
              </h2>
              <div className="space-y-4">
                {paliers.map((palier, i) => {
                  const atteint = montantCollecte >= palier.montant;
                  const enCours = !atteint && (i === 0 || montantCollecte >= paliers[i - 1].montant);

                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-4 p-3 rounded-xl transition-colors ${
                        atteint ? 'bg-emerald-50' : enCours ? 'bg-blue-50' : 'bg-gray-50'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {atteint ? (
                          <CheckCircle2 size={22} className="text-vert" />
                        ) : enCours ? (
                          <TrendingUp size={22} className="text-bleu" />
                        ) : (
                          <Circle size={22} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-lg font-bold ${atteint ? 'text-vert' : enCours ? 'text-bleu' : 'text-gray-400'}`}>
                            {palier.montant.toLocaleString('fr-FR')}€
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            atteint ? 'text-emerald-600' : enCours ? 'text-blue-600' : 'text-gray-400'
                          }`}>
                            {atteint ? 'Atteint' : enCours ? 'En cours' : 'À venir'}
                          </span>
                        </div>
                        <p className={`text-sm mt-0.5 ${atteint ? 'text-emerald-700' : 'text-gray-600'}`}>
                          {palier.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Soutiens reçus ── */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold text-texte flex items-center gap-2 mb-4">
              <Heart size={18} className="text-or" />
              Soutiens reçus
              <span className="text-xs text-gray-400 font-normal">({soutiens.length})</span>
            </h2>

            {soutiens.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Aucun soutien pour le moment. Soyez le premier !
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {soutiens.map((soutien) => (
                  <div key={soutien.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-or/10 flex items-center justify-center shrink-0">
                      <Heart size={14} className="text-or" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-texte">
                        {soutien.anonyme ? 'Anonyme' : (soutien.soutien_type === 'resident' ? 'Un résident' : 'Un soutien')}
                      </p>
                      {soutien.message && (
                        <p className="text-xs text-gray-400 truncate">« {soutien.message} »</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {soutien.montant && (
                        <p className="text-sm font-bold text-texte">{soutien.montant}€</p>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {new Date(soutien.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isOwner ? (
              <>
                <Link
                  to={`/mon-association`}
                  className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Edit3 size={16} />
                  Retour au dashboard
                </Link>
                {projet.statut !== 'cloture' && (
                  <button
                    onClick={handleCloturer}
                    className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={16} />
                    Clôturer le projet
                  </button>
                )}
              </>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold bg-gray-200 text-gray-500 rounded-xl cursor-not-allowed"
                title="Fonctionnalité bientôt disponible"
              >
                <Lock size={16} />
                Soutenir ce projet — Bientôt disponible
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
}
