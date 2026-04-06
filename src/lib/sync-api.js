// src/lib/sync-api.js
// Client côté front pour tester manuellement les endpoints de synchronisation
// SimplyFoot / SimplyRugby depuis le dashboard admin.
//
// Authentification : passe le JWT admin via l'endpoint proxy /api/admin-sync
// La clé RR_SYNC_API_KEY reste côté serveur uniquement.

import { supabase } from './supabase';

async function syncFetch(endpoint, data) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non connecté.');

  const res = await fetch('/api/admin-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ endpoint, ...data }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json;
}

/**
 * Synchroniser un projet depuis SimplyFoot / SimplyRugby
 * @param {object} data — voir api/sync-projet.js pour le format
 * @returns {{ success: boolean, projet_id: string, action: 'created'|'updated' }}
 */
export function syncProjet(data) {
  return syncFetch('sync-projet', data);
}

/**
 * Synchroniser un événement depuis SimplyFoot / SimplyRugby
 * @param {object} data — voir api/sync-evenement.js pour le format
 * @returns {{ success: boolean, evenement_id: string, action: 'created'|'updated' }}
 */
export function syncEvenement(data) {
  return syncFetch('sync-evenement', data);
}

/**
 * Envoyer une notification à tous les clubs/associations d'une ville
 * @param {object} data — voir api/notify-club.js pour le format
 * @returns {{ success: boolean, count: number }}
 */
export function notifyClubs(data) {
  return syncFetch('notify-club', data);
}
