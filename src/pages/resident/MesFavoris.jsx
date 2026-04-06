// src/pages/resident/MesFavoris.jsx
// Page listant tous les favoris du résident avec onglets par type
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart, Store, Users, Calendar, MapPin, Tag, ArrowLeft, Globe,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFavoris } from '../../hooks/useFavoris';
import { supabase } from '../../lib/supabase';
import BoutonFavori from '../../components/BoutonFavori';
import usePageMeta from '../../hooks/usePageMeta';

const ONGLETS = [
  { id: 'commerce', label: 'Commerces', icon: Store },
  { id: 'association', label: 'Associations', icon: Users },
  { id: 'evenement', label: 'Événements', icon: Calendar },
];

// ── Cards ────────────────────────────────────────────────────

function CommerceCard({ commerce, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bleu/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-bleu/10 flex items-center justify-center text-bleu shrink-0">
          <Store size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-texte text-sm truncate">{commerce.nom}</h4>
          <span className="text-xs text-gray-400">{commerce.categorie}</span>
        </div>
        <BoutonFavori isFavori onClick={() => onToggle('commerce', commerce.id)} size={14} />
      </div>
      {commerce.avantage && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-bleu-clair">
          <Tag size={13} className="shrink-0 mt-0.5" />
          <span>{commerce.avantage}</span>
        </div>
      )}
      {commerce.adresse && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-400">
          <MapPin size={13} className="shrink-0 mt-0.5" />
          <span className="truncate">{commerce.adresse}</span>
        </div>
      )}
    </div>
  );
}

function AssociationCard({ association, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-vert/20 transition-all">
      <div className="flex items-start gap-3">
        {association.logo_url ? (
          <img
            src={association.logo_url}
            alt={association.nom}
            className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-vert/10 flex items-center justify-center text-vert shrink-0">
            <Users size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-texte text-sm truncate">{association.nom}</h4>
          {association.categorie && (
            <span className="text-xs text-gray-400">{association.categorie}</span>
          )}
        </div>
        <BoutonFavori isFavori onClick={() => onToggle('association', association.id)} size={14} />
      </div>
      {association.description && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{association.description}</p>
      )}
      {association.site_web && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-bleu">
          <Globe size={12} />
          <a href={association.site_web} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
            {association.site_web.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}
    </div>
  );
}

function EvenementCard({ evenement, onToggle }) {
  const dateDebut = evenement.date_debut
    ? new Date(evenement.date_debut).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-or/20 transition-all">
      {evenement.image_url && (
        <img
          src={evenement.image_url}
          alt={evenement.titre}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-texte text-sm">{evenement.titre}</h4>
          <BoutonFavori isFavori onClick={() => onToggle('evenement', evenement.id)} size={14} />
        </div>
        {dateDebut && (
          <div className="flex items-center gap-1.5 text-xs text-or font-medium mb-1">
            <Calendar size={12} />
            {dateDebut}
          </div>
        )}
        {evenement.lieu && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MapPin size={12} />
            <span className="truncate">{evenement.lieu}</span>
          </div>
        )}
        {evenement.categorie && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-bleu/10 text-bleu">
            {evenement.categorie}
          </span>
        )}
      </div>
    </div>
  );
}

// ── État vide ────────────────────────────────────────────────
function VideMessage({ type }) {
  const config = {
    commerce: { icon: Store, texte: 'Aucun commerce dans vos favoris.', couleur: 'text-bleu' },
    association: { icon: Users, texte: 'Aucune association dans vos favoris.', couleur: 'text-vert' },
    evenement: { icon: Calendar, texte: 'Aucun événement dans vos favoris.', couleur: 'text-or' },
  };
  const c = config[type] ?? config.commerce;
  const Icon = c.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <Icon size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400 text-sm">{c.texte}</p>
      <p className="text-xs text-gray-300 mt-1">
        Ajoutez des favoris en cliquant sur le cœur depuis les pages de votre ville.
      </p>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────
export default function MesFavoris() {
  const { profile } = useAuth();
  const { favoris, isLoading: favLoading, isFavori, toggleFavori, getFavorisParType } = useFavoris(profile?.id);
  usePageMeta('Mes favoris');

  const [onglet, setOnglet] = useState('commerce');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger les données de l'onglet actif
  useEffect(() => {
    if (favLoading) return;

    const ids = getFavorisParType(onglet);
    if (ids.length === 0) {
      setItems([]);
      return;
    }

    async function charger() {
      try {
        setIsLoading(true);

        const tableMap = {
          commerce: 'commerces',
          association: 'associations',
          evenement: 'evenements',
        };
        const table = tableMap[onglet];
        if (!table) return;

        const selectMap = {
          commerces: 'id, nom, categorie, avantage, adresse',
          associations: 'id, nom, categorie, description, logo_url, site_web',
          evenements: 'id, titre, date_debut, lieu, categorie, image_url',
        };
        const { data, error } = await supabase
          .from(table)
          .select(selectMap[table] || 'id')
          .in('id', ids);

        if (error) throw error;
        setItems(data ?? []);
      } catch (err) {
        console.error(`Erreur chargement favoris ${onglet}:`, err);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [onglet, favoris, favLoading, getFavorisParType]);

  // Compte par type
  const compteurs = {
    commerce: getFavorisParType('commerce').length,
    association: getFavorisParType('association').length,
    evenement: getFavorisParType('evenement').length,
  };

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Link
            to="/mon-espace"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-bleu transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Mon espace
          </Link>
          <h1 className="font-serif text-3xl font-bold text-texte flex items-center gap-3">
            <Heart size={28} className="text-red-500" />
            Mes favoris
          </h1>
          <p className="text-gray-500 mt-1">
            {compteurs.commerce + compteurs.association + compteurs.evenement} favori{(compteurs.commerce + compteurs.association + compteurs.evenement) !== 1 ? 's' : ''} au total
          </p>
        </motion.div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {ONGLETS.map((tab) => {
            const Icon = tab.icon;
            const actif = onglet === tab.id;
            const count = compteurs[tab.id] ?? 0;

            return (
              <button
                key={tab.id}
                onClick={() => setOnglet(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  actif
                    ? 'bg-bleu text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-bleu/30 hover:text-bleu'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    actif ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenu */}
        {favLoading || isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <VideMessage type={onglet} />
        ) : (
          <motion.div
            key={onglet}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`grid gap-4 ${
              onglet === 'evenement'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {items.map((item) => {
              if (onglet === 'commerce') {
                return <CommerceCard key={item.id} commerce={item} onToggle={toggleFavori} />;
              }
              if (onglet === 'association') {
                return <AssociationCard key={item.id} association={item} onToggle={toggleFavori} />;
              }
              return <EvenementCard key={item.id} evenement={item} onToggle={toggleFavori} />;
            })}
          </motion.div>
        )}

      </div>
    </div>
  );
}
