// src/pages/resident/components/ProjetsLocaux.jsx
// Liste des projets actifs de la ville du résident avec filtres et tri.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Filter, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ProjetCard from '../../association/components/ProjetCard';

const CATEGORIES = [
  { value: '', label: 'Toutes' },
  { value: 'sport', label: 'Sport' },
  { value: 'culture', label: 'Culture' },
  { value: 'social', label: 'Social' },
  { value: 'autre', label: 'Autre' },
];

export default function ProjetsLocaux({ villeId, limit }) {
  const [projets, setProjets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtre, setFiltre] = useState('');

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
        console.error('Erreur chargement projets locaux:', err);
      } finally {
        setIsLoading(false);
      }
    }

    charger();
  }, [villeId]);

  // Normalise la catégorie de l'association vers le filtre
  function normaliserCategorie(cat) {
    if (!cat) return 'autre';
    const lower = cat.toLowerCase();
    if (lower.includes('sport') || lower.includes('foot') || lower.includes('rugby') || lower.includes('basket') || lower.includes('tennis') || lower.includes('athlé')) return 'sport';
    if (lower.includes('cultur') || lower.includes('théâtre') || lower.includes('musique') || lower.includes('danse') || lower.includes('art') || lower.includes('cinema')) return 'culture';
    if (lower.includes('social') || lower.includes('solidar') || lower.includes('humanitaire') || lower.includes('entraide') || lower.includes('caritatif')) return 'social';
    return 'autre';
  }

  // Filtrage
  const projetsFiltres = filtre
    ? projets.filter((p) => normaliserCategorie(p.associations?.categorie) === filtre)
    : projets;

  // Tri : les plus proches de l'objectif en premier, puis les plus récents
  const projetsTries = [...projetsFiltres].sort((a, b) => {
    const progA = a.objectif_montant > 0 ? (a.montant_collecte ?? 0) / a.objectif_montant : 0;
    const progB = b.objectif_montant > 0 ? (b.montant_collecte ?? 0) / b.objectif_montant : 0;
    // Plus proche de 100% en premier (mais pas déjà atteint à 100%)
    const distA = progA >= 1 ? 2 : 1 - progA;
    const distB = progB >= 1 ? 2 : 1 - progB;
    if (distA !== distB) return distA - distB;
    // Puis les plus récents
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const projetsAffiches = limit ? projetsTries.slice(0, limit) : projetsTries;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + filtre (masqué en mode limité) */}
      {!limit && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2">
            <FolderOpen size={20} className="text-vert" />
            Projets locaux
          </h2>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFiltre(cat.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filtre === cat.value
                    ? 'bg-bleu text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenu */}
      {projetsAffiches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <FolderOpen size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {filtre ? 'Aucun projet dans cette catégorie.' : 'Aucun projet actif dans votre ville pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projetsAffiches.map((projet) => (
            <ProjetCard
              key={projet.id}
              projet={projet}
              associationNom={projet.associations?.nom}
              lien={`/projets/${projet.id}`}
            />
          ))}
        </div>
      )}

      {/* Lien "Voir tous" en mode limité */}
      {limit && projetsTries.length > limit && (
        <div className="text-center pt-2">
          <Link
            to="/mon-espace"
            className="text-sm text-bleu hover:text-bleu-clair transition-colors font-medium inline-flex items-center gap-1"
          >
            Voir tous les projets
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
