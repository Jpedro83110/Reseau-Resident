// src/hooks/useFavoris.js
// Hook pour gérer les favoris d'un résident (commerces, associations, événements)
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useFavoris(profileId) {
  const [favoris, setFavoris] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }

    async function charger() {
      try {
        const { data, error } = await supabase
          .from('favoris')
          .select('id, favori_type, favori_id, created_at')
          .eq('profile_id', profileId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFavoris(data ?? []);
      } catch (err) {
        console.error('Erreur chargement favoris:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [profileId]);

  const isFavori = useCallback(
    (type, id) => favoris.some((f) => f.favori_type === type && f.favori_id === id),
    [favoris]
  );

  const toggleFavori = useCallback(
    async (type, id) => {
      if (!profileId) return;

      const existant = favoris.find((f) => f.favori_type === type && f.favori_id === id);

      if (existant) {
        // Optimistic : retirer immédiatement
        setFavoris((prev) => prev.filter((f) => f.id !== existant.id));
        const { error } = await supabase.from('favoris').delete().eq('id', existant.id);
        if (error) {
          // Rollback
          setFavoris((prev) => [existant, ...prev]);
          console.error('Erreur suppression favori:', error);
        }
      } else {
        // Optimistic : ajouter immédiatement avec un id temporaire
        const tempId = `temp_${Date.now()}`;
        const optimistic = { id: tempId, favori_type: type, favori_id: id, created_at: new Date().toISOString() };
        setFavoris((prev) => [optimistic, ...prev]);

        const { data, error } = await supabase
          .from('favoris')
          .insert({ profile_id: profileId, favori_type: type, favori_id: id })
          .select()
          .single();
        if (error) {
          // Rollback
          setFavoris((prev) => prev.filter((f) => f.id !== tempId));
          console.error('Erreur ajout favori:', error);
        } else if (data) {
          // Remplacer l'entrée temporaire par la vraie
          setFavoris((prev) => prev.map((f) => (f.id === tempId ? data : f)));
        }
      }
    },
    [profileId, favoris]
  );

  const getFavorisParType = useCallback(
    (type) => favoris.filter((f) => f.favori_type === type).map((f) => f.favori_id),
    [favoris]
  );

  return { favoris, isLoading, isFavori, toggleFavori, getFavorisParType };
}
