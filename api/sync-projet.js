// api/sync-projet.js
// Description : Reçoit un projet depuis SimplyFoot ou SimplyRugby et le crée/met à jour dans RR
// Méthode : POST
// Auth : Header X-API-Key vérifié contre la variable env RR_SYNC_API_KEY

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, safeCompare, serverError } from './_utils.js';

const rateLimit = createRateLimiter('sync-projet', { windowMs: 10000, max: 10 });

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
    const {
      source, source_id, ville_slug, association_nom,
      titre, description, objectif_montant, paliers, image_url, date_limite,
    } = req.body;

    if (!source || !['simplyfot', 'simplyrugby'].includes(source)) {
      return res.status(400).json({ error: 'source doit être "simplyfot" ou "simplyrugby"' });
    }
    if (!source_id) return res.status(400).json({ error: 'source_id requis' });
    if (!ville_slug) return res.status(400).json({ error: 'ville_slug requis' });
    if (!association_nom) return res.status(400).json({ error: 'association_nom requis' });
    if (!titre) return res.status(400).json({ error: 'titre requis' });
    if (!description) return res.status(400).json({ error: 'description requis' });
    if (!objectif_montant || objectif_montant <= 0) {
      return res.status(400).json({ error: 'objectif_montant doit être un nombre > 0' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: ville, error: villeError } = await supabase
      .from('villes')
      .select('id')
      .eq('slug', ville_slug)
      .maybeSingle();

    if (villeError) throw villeError;
    if (!ville) return res.status(404).json({ error: `Ville "${ville_slug}" non trouvée` });

    let { data: association } = await supabase
      .from('associations')
      .select('id')
      .eq('nom', association_nom)
      .eq('ville_id', ville.id)
      .maybeSingle();

    if (!association) {
      const { data: newAsso, error: assoError } = await supabase
        .from('associations')
        .insert({
          ville_id: ville.id,
          nom: association_nom,
          categorie: 'Sport',
          actif: true,
        })
        .select('id')
        .single();

      if (assoError) throw assoError;
      association = newAsso;
    }

    const { data: existant } = await supabase
      .from('projets')
      .select('id')
      .eq('source', source)
      .eq('source_id', source_id)
      .maybeSingle();

    if (existant) {
      const { error: updateError } = await supabase
        .from('projets')
        .update({
          titre,
          description,
          objectif_montant,
          paliers: paliers ?? null,
          image_url: image_url ?? null,
          date_limite: date_limite ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existant.id);

      if (updateError) throw updateError;
      return res.status(200).json({ success: true, projet_id: existant.id, action: 'updated' });
    }

    const { data: projet, error: projetError } = await supabase
      .from('projets')
      .insert({
        association_id: association.id,
        ville_id: ville.id,
        titre,
        description,
        objectif_montant,
        montant_collecte: 0,
        paliers: paliers ?? null,
        image_url: image_url ?? null,
        date_limite: date_limite ?? null,
        statut: 'actif',
        source,
        source_id,
      })
      .select('id')
      .single();

    if (projetError) throw projetError;
    return res.status(201).json({ success: true, projet_id: projet.id, action: 'created' });

  } catch (error) {
    return serverError(res, error, 'sync-projet');
  }
}
