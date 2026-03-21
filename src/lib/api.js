/**
 * api.js — Couche d'accès Supabase. Aucun appel direct depuis les composants.
 */
import { supabase } from './supabase';

// ─── VILLES ──────────────────────────────────────────────────

export async function getVilles() {
  const { data, error } = await supabase
    .from('villes')
    .select('id, slug, nom, departement, statut, cartes_actives, commerces_partenaires, visites_total, description')
    .order('statut').order('nom');
  if (error) throw error;
  return data;
}

export async function getVilleBySlug(slug) {
  const { data, error } = await supabase
    .from('villes')
    .select('*, commerces (id, nom, categorie, avantage, adresse, actif, visites)')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

// ─── STATS (agrégation serveur via RPC) ──────────────────────

export async function getStatsMensuelles(villeId) {
  const { data, error } = await supabase.rpc('get_stats_mensuelles', { p_ville_id: villeId });
  if (error) throw error;
  return data ?? [];
}

// ─── INSCRIPTION RÉSIDENT ────────────────────────────────────

function genererNumeroCarte(villeSlug) {
  const prefix = villeSlug.toUpperCase().slice(0, 3);
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return `${prefix}-${100000 + (array[0] % 900000)}`;
}

export async function creerInscription({ formule, ville_slug, prenom, nom, email, telephone, adresse, retrait_commerce, type_carte = 'physique' }) {
  const { data: ville, error: villeError } = await supabase
    .from('villes').select('id').eq('slug', ville_slug).single();
  if (villeError) throw villeError;

  const date_expiration = new Date();
  date_expiration.setFullYear(date_expiration.getFullYear() + 1);

  let attempts = 0;
  while (attempts < 3) {
    const numero = genererNumeroCarte(ville_slug);
    const { data, error } = await supabase.from('cartes').insert({
      numero, ville_id: ville.id, formule, type_carte, email, prenom,
      nom_titulaire: nom, telephone,
      adresse: retrait_commerce ? null : adresse,
      retrait_commerce, date_expiration: date_expiration.toISOString(),
      statut: 'en_attente_paiement',
    }).select('id, numero, qr_token').single();

    if (!error) return data;
    if (error.code === '23505') { attempts++; continue; }
    throw error;
  }
  throw new Error('Impossible de générer un numéro unique. Réessayez.');
}

export async function confirmerPaiement(carteId, stripePaymentIntentId) {
  const { error } = await supabase.from('cartes')
    .update({ statut: 'active', stripe_payment_intent_id: stripePaymentIntentId })
    .eq('id', carteId);
  if (error) throw error;
}

// ─── RÉSILIATION CARTE ───────────────────────────────────────

export async function resilierCarte(numero, email) {
  const { data, error } = await supabase.rpc('resilier_carte', {
    p_numero: numero, p_email: email,
  });
  if (error) throw error;
  return data; // true si trouvée et résiliée
}

// ─── SCAN QR CODE ────────────────────────────────────────────

export async function getCarteByQrToken(qrToken) {
  const { data, error } = await supabase.rpc('get_carte_by_qr', { p_qr_token: qrToken });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function enregistrerVisite({ carte_id, commerce_id, ville_id, source = 'qr' }) {
  const { data, error } = await supabase.from('visites')
    .insert({ carte_id, commerce_id, ville_id, source })
    .select('id').single();
  if (error) throw error;
  return data;
}

export async function getCommercesForVille(villeId) {
  const { data, error } = await supabase.from('commerces')
    .select('id, nom, categorie, avantage')
    .eq('ville_id', villeId).eq('actif', true).order('nom');
  if (error) throw error;
  return data;
}

// ─── INSCRIPTION COMMERÇANT ──────────────────────────────────

export async function creerDemandeCommercant({ nom_commerce, categorie, nom_ville, departement, adresse, telephone, email, avantage, siret }) {
  const { data, error } = await supabase.from('commercants_inscrits').insert({
    nom_commerce, categorie, nom_ville, departement: departement || null,
    adresse, telephone, email, avantage_propose: avantage,
    siret: siret || null, statut: 'en_attente',
  }).select('id').single();
  if (error) throw error;
  return data;
}

// ─── RETRAIT COMMERCE ────────────────────────────────────────

export async function retirerCommerce(commerceId, token) {
  const { data, error } = await supabase.rpc('retirer_commerce', {
    p_commerce_id: commerceId, p_token: token,
  });
  if (error) throw error;
  return data;
}

// ─── DASHBOARD ADMIN (RPC enrichi) ──────────────────────────

export async function getAdminDashboard(villeSlug) {
  const { data, error } = await supabase.rpc('get_admin_dashboard', { p_ville_slug: villeSlug });
  if (error) throw error;
  return data;
}

export async function getDashboardStats(villeSlug) {
  const { data: ville, error } = await supabase.from('villes')
    .select('id, nom, cartes_actives, commerces_partenaires, visites_total, commerces (id, nom, categorie, avantage, visites)')
    .eq('slug', villeSlug).single();
  if (error) throw error;
  return ville;
}

// ─── LISTE D'ATTENTE ─────────────────────────────────────────

export async function inscrireListeAttente(email, ville_slug) {
  const { error } = await supabase.from('liste_attente')
    .upsert({ email, ville_slug }, { onConflict: 'email,ville_slug' });
  if (error) throw error;
}
