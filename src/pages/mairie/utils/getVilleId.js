// src/pages/mairie/utils/getVilleId.js
// Récupère la ville_id du user mairie (avec fallback admin → première ville active)
import { supabase } from '../../../lib/supabase';

export async function getVilleIdForUser(userId) {
  // 1. Chercher dans mairie_profiles
  const { data: profil } = await supabase
    .from('mairie_profiles')
    .select('ville_id')
    .eq('id', userId)
    .maybeSingle();

  if (profil?.ville_id) return profil.ville_id;

  // 2. Fallback admin → première ville active
  const { data: ville } = await supabase
    .from('villes')
    .select('id')
    .eq('statut', 'actif')
    .limit(1)
    .maybeSingle();

  return ville?.id ?? null;
}
