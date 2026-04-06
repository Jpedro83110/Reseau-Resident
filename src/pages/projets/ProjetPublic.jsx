// src/pages/projets/ProjetPublic.jsx
// Page publique complète d'un projet associatif.
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, TrendingUp, Users, Target, Heart,
  CheckCircle2, Circle, Clock, Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

const STATUTS = {
  brouillon: { label: 'Brouillon',        bg: 'bg-gray-100',    text: 'text-gray-600' },
  actif:     { label: 'Actif',            bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  atteint:   { label: 'Objectif atteint', bg: 'bg-blue-50',     text: 'text-blue-700' },
  cloture:   { label: 'Clôturé',          bg: 'bg-red-50',      text: 'text-red-600' },
};

export default function ProjetPublic() {
  const { id } = useParams();
  const [projet, setProjet] = useState(null);
  const [association, setAssociation] = useState(null);
  const [soutiens, setSoutiens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageMeta(projet?.titre || 'Projet');

  useEffect(() => {
    async function charger() {
      try {
        setIsLoading(true);

        // 1. Charger le projet
        const { data: projetData, error: projetError } = await supabase
          .from('projets')
          .select('id, association_id, ville_id, titre, description, objectif_montant, montant_collecte, paliers, image_url, date_limite, statut, source, created_at')
          .eq('id', id)
          .maybeSingle();

        if (projetError) throw projetError;
        if (!projetData) { setError('Projet introuvable.'); return; }
        setProjet(projetData);

        // 2. Charger association + soutiens en parallèle
        const [assoRes, soutiensRes] = await Promise.all([
          supabase
            .from('associations')
            .select('id, nom, categorie, logo_url, description')
            .eq('id', projetData.association_id)
            .maybeSingle(),
          supabase
            .from('soutiens')
            .select('id, montant, message, anonyme, soutien_type, created_at')
            .eq('projet_id', projetData.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        setAssociation(assoRes.data);
        setSoutiens(soutiensRes.data ?? []);
      } catch (err) {
        setError('Erreur lors du chargement du projet.');
        console.error('Erreur ProjetPublic:', err);
      } finally {
        setIsLoading(false);
      }
    }

    charger();
  }, [id]);

  // ── Chargement ──
  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Chargement du projet…</p>
        </div>
      </div>
    );
  }

  // ── Erreur ──
  if (error || !projet) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-4">
          <p className="text-red-600 font-medium">{error ?? 'Projet introuvable.'}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-bleu hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const statut = STATUTS[projet.statut] ?? STATUTS.brouillon;
  const progression = projet.objectif_montant > 0
    ? Math.min(100, Math.round(((projet.montant_collecte ?? 0) / projet.objectif_montant) * 100))
    : 0;
  const paliers = Array.isArray(projet.paliers) ? projet.paliers : [];

  return (
    <div className="min-h-screen pt-24 pb-24 bg-creme">

      {/* Image hero */}
      {projet.image_url ? (
        <div className="w-full h-64 md:h-80 overflow-hidden relative">
          <img src={projet.image_url} alt={projet.titre} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-bleu/15 to-bleu/5 flex items-center justify-center">
          <ImageIcon size={48} className="text-bleu/20" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">

        {/* Retour */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-texte transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Retour
        </Link>

        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm mb-6"
        >
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${statut.bg} ${statut.text}`}>
              {statut.label}
            </span>
            {projet.date_limite && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={12} />
                Jusqu'au {new Date(projet.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            {projet.source && projet.source !== 'local' && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                {projet.source}
              </span>
            )}
          </div>

          {/* Titre */}
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-texte mb-2">
            {projet.titre}
          </h1>

          {/* Association */}
          {association && (
            <div className="flex items-center gap-3 mb-6">
              {association.logo_url ? (
                <img src={association.logo_url} alt={association.nom} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-vert/10 flex items-center justify-center text-vert">
                  <Users size={18} />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-texte">{association.nom}</p>
                {association.categorie && (
                  <p className="text-xs text-gray-400">{association.categorie}</p>
                )}
              </div>
            </div>
          )}

          {/* Montant + progression */}
          <div className="bg-creme rounded-xl p-5 mb-6">
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-3xl font-bold text-texte">
                  {(projet.montant_collecte ?? 0).toLocaleString('fr-FR')}€
                </p>
                <p className="text-sm text-gray-400">
                  collectés sur {projet.objectif_montant?.toLocaleString('fr-FR') ?? 0}€
                </p>
              </div>
              <span className="text-2xl font-bold text-bleu">{progression}%</span>
            </div>

            {/* Barre animée */}
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progression}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${progression >= 100 ? 'bg-vert' : 'bg-bleu'}`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{projet.description}</p>
          </div>

          {projet.objectif_description && (
            <div className="mt-5 bg-bleu/5 border border-bleu/15 rounded-xl p-4">
              <p className="text-xs font-medium text-bleu mb-1 flex items-center gap-1.5">
                <Target size={13} />
                Objectif
              </p>
              <p className="text-sm text-gray-700">{projet.objectif_description}</p>
            </div>
          )}
        </motion.div>

        {/* Paliers — timeline verticale */}
        {paliers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm mb-6"
          >
            <h2 className="font-serif text-lg font-bold text-texte mb-6 flex items-center gap-2">
              <Target size={18} className="text-or" />
              Paliers du projet
            </h2>

            <div className="relative">
              {/* Ligne verticale */}
              <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-0">
                {paliers.map((palier, i) => {
                  const montantPalier = palier.montant ?? 0;
                  const collecte = projet.montant_collecte ?? 0;
                  const isAtteint = collecte >= montantPalier;
                  const isEnCours = !isAtteint && (i === 0 || collecte >= (paliers[i - 1]?.montant ?? 0));

                  return (
                    <div key={i} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      {/* Icône */}
                      <div className="relative z-10 shrink-0">
                        {isAtteint ? (
                          <div className="w-9 h-9 rounded-full bg-vert flex items-center justify-center">
                            <CheckCircle2 size={18} className="text-white" />
                          </div>
                        ) : isEnCours ? (
                          <div className="w-9 h-9 rounded-full bg-bleu flex items-center justify-center animate-pulse">
                            <TrendingUp size={18} className="text-white" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                            <Circle size={16} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Contenu */}
                      <div className={`flex-1 rounded-xl p-4 transition-colors ${
                        isAtteint
                          ? 'bg-vert/5 border border-vert/20'
                          : isEnCours
                            ? 'bg-bleu/5 border border-bleu/20'
                            : 'bg-gray-50 border border-gray-100'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-bold ${
                            isAtteint ? 'text-vert' : isEnCours ? 'text-bleu' : 'text-gray-400'
                          }`}>
                            {montantPalier.toLocaleString('fr-FR')}€
                          </span>
                          <span className={`text-[11px] font-medium uppercase tracking-wider ${
                            isAtteint ? 'text-vert' : isEnCours ? 'text-bleu' : 'text-gray-300'
                          }`}>
                            {isAtteint ? 'Atteint ✓' : isEnCours ? 'En cours' : 'À venir'}
                          </span>
                        </div>
                        <p className={`text-sm ${isAtteint || isEnCours ? 'text-gray-700' : 'text-gray-400'}`}>
                          {palier.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Derniers soutiens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm mb-6"
        >
          <h2 className="font-serif text-lg font-bold text-texte mb-4 flex items-center gap-2">
            <Heart size={18} className="text-red-400" />
            Derniers soutiens
          </h2>

          {soutiens.length === 0 ? (
            <div className="text-center py-6">
              <Heart size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun soutien pour le moment. Soyez le premier !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {soutiens.map((soutien) => {
                const typeLabel = {
                  resident: 'Résident',
                  commerce: 'Commerce',
                  mairie: 'Mairie',
                };
                return (
                  <div key={soutien.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-bleu/10 flex items-center justify-center text-bleu shrink-0">
                      <Heart size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-texte">
                          {soutien.anonyme ? 'Soutien anonyme' : (typeLabel[soutien.soutien_type] ?? 'Soutien')}
                        </span>
                        {soutien.montant > 0 && (
                          <span className="text-sm font-bold text-vert">{soutien.montant}€</span>
                        )}
                      </div>
                      {soutien.message && (
                        <p className="text-xs text-gray-500 mt-0.5">« {soutien.message} »</p>
                      )}
                      <p className="text-[11px] text-gray-300 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(soutien.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Bouton soutenir */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="text-center mb-8"
        >
          <button
            disabled
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-200 text-gray-400 font-bold rounded-xl cursor-not-allowed text-sm"
          >
            <Heart size={18} />
            Soutenir ce projet — Bientôt disponible
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Le soutien financier sera disponible prochainement.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
