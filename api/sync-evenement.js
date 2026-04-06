// api/sync-evenement.js
// Description : Reçoit un événement depuis SimplyFoot ou SimplyRugby et le crée dans RR
// Méthode : POST
// Auth : Header X-API-Key vérifié contre la variable env RR_SYNC_API_KEY

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, safeCompare, serverError } from './_utils.js';

const rateLimit = createRateLimiter('sync-evenement', { windowMs: 10000, max: 10 });

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
      source, source_id, ville_slug, titre, description, lieu,
      date_debut, date_fin, organisateur_nom, categorie,
      image_url, gratuit, prix, lien_externe,
    } = req.body;

    if (!source || !['simplyfot', 'simplyrugby'].includes(source)) {
      return res.status(400).json({ error: 'source doit être "simplyfot" ou "simplyrugby"' });
    }
    if (!source_id) return res.status(400).json({ error: 'source_id requis' });
    if (!ville_slug) return res.status(400).json({ error: 'ville_slug requis' });
    if (!titre) return res.status(400).json({ error: 'titre requis' });
    if (!date_debut) return res.status(400).json({ error: 'date_debut requis' });
    if (!organisateur_nom) return res.status(400).json({ error: 'organisateur_nom requis' });

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
      .eq('nom', organisateur_nom)
      .eq('ville_id', ville.id)
      .maybeSingle();

    if (!association) {
      const { data: newAsso, error: assoError } = await supabase
        .from('associations')
        .insert({
          ville_id: ville.id,
          nom: organisateur_nom,
          categorie: 'Sport',
          actif: true,
        })
        .select('id')
        .single();

      if (assoError) throw assoError;
      association = newAsso;
    }

    const { data: existant } = await supabase
      .from('evenements')
      .select('id')
      .eq('openagenda_id', `${source}:${source_id}`)
      .maybeSingle();

    if (existant) {
      const { error: updateError } = await supabase
        .from('evenements')
        .update({
          titre,
          description: description ?? null,
          lieu: lieu ?? null,
          date_debut,
          date_fin: date_fin ?? null,
          categorie: categorie ?? 'Sport',
          image_url: image_url ?? null,
          gratuit: gratuit ?? true,
          prix: prix ?? null,
          lien_externe: lien_externe ?? null,
        })
        .eq('id', existant.id);

      if (updateError) throw updateError;
      return res.status(200).json({ success: true, evenement_id: existant.id, action: 'updated' });
    }

    const { data: evenement, error: evtError } = await supabase
      .from('evenements')
      .insert({
        ville_id: ville.id,
        organisateur_type: 'club',
        organisateur_id: association.id,
        titre,
        description: description ?? null,
        lieu: lieu ?? null,
        date_debut,
        date_fin: date_fin ?? null,
        categorie: categorie ?? 'Sport',
        image_url: image_url ?? null,
        gratuit: gratuit ?? true,
        prix: prix ?? null,
        lien_externe: lien_externe ?? null,
        openagenda_id: `${source}:${source_id}`,
        statut: 'publie',
      })
      .select('id')
      .single();

    if (evtError) throw evtError;
    return res.status(201).json({ success: true, evenement_id: evenement.id, action: 'created' });

  } catch (error) {
    return serverError(res, error, 'sync-evenement');
  }
}
