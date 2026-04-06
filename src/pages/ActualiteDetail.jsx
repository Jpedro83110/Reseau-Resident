// src/pages/ActualiteDetail.jsx
// Page publique : vue complète d'une actualité.
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Store, Users, Building2, Shield, Pin, Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import usePageMeta from '../hooks/usePageMeta';

const AUTEUR_CONFIG = {
  mairie:      { label: 'Mairie',      icon: Building2 },
  commerce:    { label: 'Commerce',    icon: Store },
  association: { label: 'Association', icon: Users },
  club:        { label: 'Club',        icon: Users },
  admin:       { label: 'Admin',       icon: Shield },
};

export default function ActualiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [actualite, setActualite] = useState(null);
  const [auteurNom, setAuteurNom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageMeta(actualite?.titre || 'Actualité');

  useEffect(() => {
    async function charger() {
      try {
        setIsLoading(true);

        const { data, error: fetchError } = await supabase
          .from('actualites')
          .select('id, titre, contenu, image_url, categorie, auteur_type, auteur_id, epingle, publie, created_at')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!data) { setError('Actualité introuvable.'); return; }

        setActualite(data);

        // Charger le nom de l'auteur
        if (data.auteur_type === 'commerce' && data.auteur_id) {
          const { data: commerce } = await supabase
            .from('commerces')
            .select('nom')
            .eq('id', data.auteur_id)
            .maybeSingle();
          if (commerce) setAuteurNom(commerce.nom);
        } else if ((data.auteur_type === 'association' || data.auteur_type === 'club') && data.auteur_id) {
          const { data: asso } = await supabase
            .from('associations')
            .select('nom')
            .eq('id', data.auteur_id)
            .maybeSingle();
          if (asso) setAuteurNom(asso.nom);
        } else if (data.auteur_type === 'mairie' && data.auteur_id) {
          const { data: ville } = await supabase
            .from('villes')
            .select('nom')
            .eq('id', data.ville_id)
            .maybeSingle();
          if (ville) setAuteurNom(`Mairie de ${ville.nom}`);
        }
      } catch (err) {
        setError('Erreur lors du chargement de l\'actualité.');
        console.error('Erreur ActualiteDetail:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !actualite) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-4">
          <p className="text-red-600 font-medium">{error ?? 'Actualité introuvable.'}</p>
          <Link to="/" className="mt-4 inline-block px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-sm">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const auteurConfig = AUTEUR_CONFIG[actualite.auteur_type] ?? AUTEUR_CONFIG.admin;
  const AuteurIcon = auteurConfig.icon;
  const dateFormatee = new Date(actualite.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Image hero */}
          {actualite.image_url ? (
            <div className="h-56 md:h-72 rounded-2xl overflow-hidden mb-6 shadow-sm">
              <img
                src={actualite.image_url}
                alt={actualite.titre}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-32 rounded-2xl bg-gradient-to-br from-bleu/10 to-bleu/5 flex items-center justify-center mb-6">
              <ImageIcon size={36} className="text-bleu/20" />
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {actualite.epingle && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-or/10 text-or">
                <Pin size={10} />
                Épinglé
              </span>
            )}
            {actualite.categorie && (
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                {actualite.categorie}
              </span>
            )}
          </div>

          {/* Titre */}
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-texte mb-4">
            {actualite.titre}
          </h1>

          {/* Auteur + date */}
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-bleu/10 flex items-center justify-center">
              <AuteurIcon size={18} className="text-bleu" />
            </div>
            <div>
              <p className="text-sm font-medium text-texte">
                {auteurNom ?? auteurConfig.label}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar size={11} />
                {dateFormatee}
              </p>
            </div>
          </div>

          {/* Contenu */}
          <div className="prose prose-gray max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
            {actualite.contenu}
          </div>
        </motion.article>
      </div>
    </div>
  );
}
