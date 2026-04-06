// src/components/ActualiteCard.jsx
// Card réutilisable pour afficher une actualité en résumé.
import { Link } from 'react-router-dom';
import { Calendar, Pin, Store, Users, Building2, Newspaper, Shield } from 'lucide-react';

const AUTEUR_CONFIG = {
  mairie:      { label: 'Mairie',      icon: Building2, bg: 'bg-blue-50',    text: 'text-blue-700' },
  commerce:    { label: 'Commerce',    icon: Store,     bg: 'bg-or/10',      text: 'text-or' },
  association: { label: 'Association', icon: Users,     bg: 'bg-emerald-50', text: 'text-emerald-700' },
  club:        { label: 'Club',        icon: Users,     bg: 'bg-emerald-50', text: 'text-emerald-700' },
  admin:       { label: 'Admin',       icon: Shield,    bg: 'bg-gray-100',   text: 'text-gray-600' },
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ActualiteCard({ actualite }) {
  const auteur = AUTEUR_CONFIG[actualite.auteur_type] ?? AUTEUR_CONFIG.admin;
  const Icon = auteur.icon;

  // Extrait limité à 150 caractères
  const extrait = actualite.contenu?.length > 150
    ? actualite.contenu.slice(0, 150).trimEnd() + '…'
    : actualite.contenu;

  return (
    <Link
      to={`/actualites/${actualite.id}`}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-bleu/20 transition-all group"
    >
      {/* Image */}
      {actualite.image_url && (
        <div className="h-40 overflow-hidden">
          <img
            src={actualite.image_url}
            alt={actualite.titre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-5">
        {/* Badges : épinglé + type auteur */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {actualite.epingle && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-or/10 text-or">
              <Pin size={10} />
              Épinglé
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${auteur.bg} ${auteur.text}`}>
            <Icon size={10} />
            {auteur.label}
          </span>
          {actualite.categorie && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
              {actualite.categorie}
            </span>
          )}
        </div>

        {/* Titre */}
        <h3 className="font-serif text-lg font-bold text-texte mb-1.5 group-hover:text-bleu transition-colors line-clamp-2">
          {actualite.titre}
        </h3>

        {/* Extrait */}
        <p className="text-sm text-gray-500 line-clamp-3 mb-3">
          {extrait}
        </p>

        {/* Date */}
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Calendar size={12} />
          {formatDate(actualite.created_at)}
        </p>
      </div>
    </Link>
  );
}
