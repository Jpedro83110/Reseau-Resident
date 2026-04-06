// src/pages/commercant/components/ProjetsVille.jsx
// Liste des projets associatifs de la ville pour les commerçants (angle sponsoring).
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Heart, Store, ArrowRight, TrendingUp, Users, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const STATUTS = {
  actif:   { label: 'Actif',            bg: 'bg-emerald-50', text: 'text-emerald-700' },
  atteint: { label: 'Objectif atteint', bg: 'bg-blue-50',    text: 'text-blue-700' },
};

export default function ProjetsVille({ villeId }) {
  const [projets, setProjets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!villeId) return;

    async function charger() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('projets')
          .select('id, titre, description, objectif_montant, montant_collecte, statut, image_url, date_limite, created_at, associations(nom, categorie)')
          .eq('ville_id', villeId)
          .in('statut', ['actif', 'atteint'])
          .order('created_at', { ascending: false });

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2">
          <FolderOpen size={20} className="text-vert" />
          Projets de votre ville
        </h2>
        <span className="text-sm text-gray-400">{projets.length} projet{projets.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Introduction sponsoring */}
      <div className="bg-or/5 border border-or/20 rounded-xl p-4 flex items-start gap-3">
        <Store size={18} className="text-or shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-texte mb-0.5">Soutenez les projets locaux</p>
          <p className="text-xs text-gray-500">
            En tant que commerçant, vous pouvez sponsoriser les projets des associations de votre ville
            et renforcer votre visibilité locale. Le badge « Commerce engagé » sera bientôt disponible.
          </p>
        </div>
      </div>

      {/* Liste */}
      {projets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FolderOpen size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun projet associatif actif dans votre ville pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projets.map((projet) => {
            const statut = STATUTS[projet.statut] ?? STATUTS.actif;
            const progression = projet.objectif_montant > 0
              ? Math.min(100, Math.round(((projet.montant_collecte ?? 0) / projet.objectif_montant) * 100))
              : 0;

            return (
              <div
                key={projet.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-or/30 transition-all"
              >
                <div className="flex gap-4">
                  {/* Image */}
                  {projet.image_url ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
                      <img src={projet.image_url} alt={projet.titre} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-bleu/10 to-bleu/5 flex items-center justify-center shrink-0">
                      <TrendingUp size={24} className="text-bleu/30" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${statut.bg} ${statut.text}`}>
                        {statut.label}
                      </span>
                      {projet.associations?.categorie && (
                        <span className="text-[11px] text-gray-400">{projet.associations.categorie}</span>
                      )}
                    </div>

                    {/* Titre + asso */}
                    <h3 className="font-semibold text-texte text-sm mb-0.5 line-clamp-1">{projet.titre}</h3>
                    {projet.associations?.nom && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                        <Users size={11} />
                        {projet.associations.nom}
                      </p>
                    )}

                    {/* Progression */}
                    {projet.objectif_montant > 0 && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-texte">{(projet.montant_collecte ?? 0).toLocaleString('fr-FR')}€</span>
                          <span className="text-gray-400">/ {projet.objectif_montant.toLocaleString('fr-FR')}€ · {progression}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${progression >= 100 ? 'bg-vert' : 'bg-bleu'}`}
                            style={{ width: `${progression}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <Link
                    to={`/projets/${projet.id}`}
                    className="text-xs text-bleu hover:text-bleu-clair font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    Voir le projet
                    <ArrowRight size={12} />
                  </Link>
                  <button
                    disabled
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg cursor-not-allowed"
                  >
                    <Heart size={12} />
                    Soutenir en tant que commerce — Bientôt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
