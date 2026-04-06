// api/notify-club.js
// Description : Pousse une annonce locale vers tous les clubs/associations d'une ville
// Méthode : POST
// Auth : Header X-API-Key vérifié contre la variable env RR_SYNC_API_KEY

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, safeCompare, serverError } from './_utils.js';

const rateLimit = createRateLimiter('notify-club', { windowMs: 10000, max: 10 });

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimit(req, res)) return;

  // Auth — comparaison timing-safe
  const syncApiKey = process.env.RR_SYNC_API_KEY;
  if (!syncApiKey) return res.status(500).json({ error: 'Erreur serveur.' });

  const apiKey = req.headers['x-api-key'];
  if (!safeCompare(apiKey, syncApiKey)) {
    return res.status(401).json({ error: 'Clé API invalide ou manquante.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  try {
    const { ville_id, titre, message, type, lien } = req.body;

    if (!ville_id) return res.status(400).json({ error: 'ville_id requis' });
    if (!titre) return res.status(400).json({ error: 'titre requis' });
    if (!message) return res.status(400).json({ error: 'message requis' });

    const notifType = type && ['offre', 'evenement', 'projet', 'actualite', 'systeme'].includes(type)
      ? type
      : 'systeme';

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: ville } = await supabase
      .from('villes')
      .select('id')
      .eq('id', ville_id)
      .maybeSingle();

    if (!ville) return res.status(404).json({ error: 'Ville non trouvée' });

    const { data: associations, error: assoError } = await supabase
      .from('associations')
      .select('id')
      .eq('ville_id', ville_id)
      .eq('actif', true);

    if (assoError) throw assoError;
    if (!associations || associations.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const assoIds = associations.map((a) => a.id);

    const { data: profiles, error: profilesError } = await supabase
      .from('association_profiles')
      .select('id')
      .in('association_id', assoIds);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const notifications = profiles.map((p) => ({
      destinataire_id: p.id,
      titre,
      message,
      type: notifType,
      lien: lien ?? null,
      lu: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    return res.status(200).json({ success: true, count: notifications.length });

  } catch (error) {
    return serverError(res, error, 'notify-club');
  }
}
