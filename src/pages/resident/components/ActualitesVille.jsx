// src/pages/resident/components/ActualitesVille.jsx
// Flux d'actualités de la ville du résident avec pagination simple.
import { useState, useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ActualiteCard from '../../../components/ActualiteCard';

const PAGE_SIZE = 10;

export default function ActualitesVille({ villeId, limit }) {
  const [actualites, setActualites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const taille = limit ?? PAGE_SIZE;

  useEffect(() => {
    if (!villeId) return;
    charger(0);
  }, [villeId]);

  async function charger(pageNum) {
    const loading = pageNum === 0;
    if (loading) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const from = pageNum * taille;
      const to = from + taille - 1;

      const { data, error } = await supabase
        .from('actualites')
        .select('id, titre, contenu, image_url, categorie, auteur_type, auteur_id, epingle, created_at')
        .eq('ville_id', villeId)
        .eq('publie', true)
        .order('epingle', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items = data ?? [];
      if (pageNum === 0) {
        setActualites(items);
      } else {
        setActualites((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === taille);
      setPage(pageNum);
    } catch (err) {
      console.error('Erreur chargement actualités ville:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (actualites.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Newspaper size={32} className="text-gray-200 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Aucune actualité dans votre ville pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actualites.map((actu) => (
          <ActualiteCard key={actu.id} actualite={actu} />
        ))}
      </div>

      {/* Bouton "Voir plus" — uniquement si pas en mode limit */}
      {!limit && hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => charger(page + 1)}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isLoadingMore ? (
              <span className="w-4 h-4 border-2 border-bleu border-t-transparent rounded-full animate-spin" />
            ) : null}
            Voir plus d'actualités
          </button>
        </div>
      )}
    </div>
  );
}
