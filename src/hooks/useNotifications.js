// src/hooks/useNotifications.js
// Hook pour gérer les notifications d'un utilisateur
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function charger() {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, titre, message, type, lien, lu, created_at')
          .eq('destinataire_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setNotifications(data ?? []);
        setNonLues((data ?? []).filter((n) => !n.lu).length);
      } catch (err) {
        console.error('Erreur chargement notifications:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();

    // Realtime : écouter les nouvelles notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `destinataire_id=eq.${userId}`,
        },
        (payload) => {
          const nouvelle = payload.new;
          setNotifications((prev) => [nouvelle, ...prev]);
          if (!nouvelle.lu) setNonLues((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const marquerLue = useCallback(
    async (id) => {
      const { error } = await supabase.from('notifications').update({ lu: true }).eq('id', id);
      if (!error) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
        setNonLues((prev) => Math.max(0, prev - 1));
      }
    },
    []
  );

  const marquerToutesLues = useCallback(
    async () => {
      if (!userId) return;
      const { error } = await supabase
        .from('notifications')
        .update({ lu: true })
        .eq('destinataire_id', userId)
        .eq('lu', false);
      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
        setNonLues(0);
      }
    },
    [userId]
  );

  return { notifications, nonLues, isLoading, marquerLue, marquerToutesLues };
}
