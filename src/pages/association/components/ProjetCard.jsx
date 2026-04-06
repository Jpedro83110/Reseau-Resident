// src/pages/association/components/ProjetCard.jsx
// Card réutilisable pour afficher un projet en résumé.
// Utilisable dans le dashboard asso ET dans le dashboard résident.
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, Users } from 'lucide-react';

const STATUTS = {
  brouillon: { label: 'Brouillon', bg: 'bg-gray-100', text: 'text-gray-600' },
  actif:     { label: 'Actif',     bg: 'bg-emerald-50', text: 'text-emerald-700' },
  atteint:   { label: 'Objectif atteint', bg: 'bg-blue-50', text: 'text-blue-700' },
  cloture:   { label: 'Clôturé',   bg: 'bg-red-50', text: 'text-red-600' },
};

export default function ProjetCard({ projet, associationNom, lien }) {
  const statut = STATUTS[projet.statut] ?? STATUTS.brouillon;

  const progression = projet.objectif_montant > 0
    ? Math.min(100, Math.round((projet.montant_collecte / projet.objectif_montant) * 100))
    : 0;

  const href = lien ?? `/mon-association/projets/${projet.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link
        to={href}
        className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-or/30 transition-all group"
      >
        {/* Image */}
        {projet.image_url ? (
          <div className="h-40 overflow-hidden">
            <img
              src={projet.image_url}
              alt={projet.titre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-28 bg-gradient-to-br from-bleu/10 to-bleu/5 flex items-center justify-center">
            <TrendingUp size={32} className="text-bleu/30" />
          </div>
        )}

        <div className="p-5">
          {/* Badge statut + date */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${statut.bg} ${statut.text}`}>
              {statut.label}
            </span>
            {projet.date_limite && (
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Calendar size={11} />
                {new Date(projet.date_limite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Titre */}
          <h3 className="font-serif text-lg font-bold text-texte mb-1 group-hover:text-bleu transition-colors line-clamp-2">
            {projet.titre}
          </h3>

          {/* Association */}
          {associationNom && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
              <Users size={12} />
              {associationNom}
            </p>
          )}

          {/* Description */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
            {projet.description}
          </p>

          {/* Barre de progression */}
          {projet.objectif_montant > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-bold text-texte">
                  {(projet.montant_collecte ?? 0).toLocaleString('fr-FR')}€
                </span>
                <span className="text-gray-400">
                  sur {projet.objectif_montant.toLocaleString('fr-FR')}€
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progression >= 100 ? 'bg-vert' : 'bg-bleu'
                  }`}
                  style={{ width: `${progression}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1 text-right font-medium">
                {progression}%
              </p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
