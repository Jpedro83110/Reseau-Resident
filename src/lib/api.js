/**
 * api.js v3 — Couche d'accès Supabase sécurisée
 * Toutes les actions sensibles passent par RPC ou API serveur
 */
import { supabase } from './supabase';

// ─── VILLES ──────────────────────────────────────────────────

export async function getVilles() {
  const { data, error } = await supabase
    .from('villes')
    .select('id, slug, nom, departement, statut, cartes_actives, commerces_partenaires, visites_total, description, logo_url, couleur_primaire, couleur_secondaire')
    .order('statut').order('nom');
  if (error) throw error;
  return data;
}

export async function getVilleBySlug(slug) {
  const { data, error } = await supabase
    .from('villes')
    .select('*, commerces (id, nom, categorie, avantage, adresse, actif, visites, latitude, longitude)')
    .eq('slug', slug).single();
  if (error) throw error;
  return data;
}

// ─── STATS ───────────────────────────────────────────────────

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

async function insertCarte({ numero, ville_id, formule, type_carte, email, prenom, nom, telephone, retrait_commerce, commande_groupe_id, ordre_titulaire }) {
  const date_expiration = new Date();
  date_expiration.setFullYear(date_expiration.getFullYear() + 1);

  const { data, error } = await supabase.from('cartes').insert({
    numero, ville_id, formule, type_carte, email, prenom,
    nom_titulaire: nom, telephone,
    retrait_commerce, date_expiration: date_expiration.toISOString(),
    statut: 'en_attente_paiement',
    commande_groupe_id: commande_groupe_id || null,
    ordre_titulaire: ordre_titulaire || 1,
  }).select('id, numero, qr_token').single();

  if (error && error.code === '23505') return null; // collision, retry
  if (error) throw error;
  return data;
}

export async function creerInscription({ formule, ville_slug, prenom, nom, prenom2, nom2, email, telephone, retrait_commerce, type_carte = 'physique' }) {
  const { data: ville, error: villeError } = await supabase
    .from('villes').select('id').eq('slug', ville_slug).single();
  if (villeError) throw villeError;

  const isCouple = formule === 'couple';
  const groupeId = isCouple ? crypto.randomUUID() : null;

  // Carte 1
  let carte1 = null;
  for (let i = 0; i < 3; i++) {
    carte1 = await insertCarte({
      numero: genererNumeroCarte(ville_slug), ville_id: ville.id,
      formule, type_carte, email, prenom, nom, telephone,
      retrait_commerce, commande_groupe_id: groupeId, ordre_titulaire: 1,
    });
    if (carte1) break;
  }
  if (!carte1) throw new Error('Impossible de générer un numéro unique.');

  // Carte 2 (couple)
  let carte2 = null;
  if (isCouple && prenom2 && nom2) {
    for (let i = 0; i < 3; i++) {
      carte2 = await insertCarte({
        numero: genererNumeroCarte(ville_slug), ville_id: ville.id,
        formule, type_carte, email, prenom: prenom2, nom: nom2, telephone,
        retrait_commerce, commande_groupe_id: groupeId, ordre_titulaire: 2,
      });
      if (carte2) break;
    }
  }

  return { carte1, carte2, commande_groupe_id: groupeId };
}

// Webhook Stripe gère l'activation des cartes côté serveur

// ─── RÉSILIATION CARTE ───────────────────────────────────────

export async function resilierCarte(numero, email) {
  const { data, error } = await supabase.rpc('resilier_carte', { p_numero: numero, p_email: email });
  if (error) throw error;
  return data;
}

// ─── SCAN QR CODE (via RPCs sécurisées) ──────────────────────

export async function getScanContext(qrToken) {
  const { data, error } = await supabase.rpc('get_scan_context', { p_qr_token: qrToken });
  if (error) throw error;
  return data;
}

export async function createVisitSecure(qrToken, commerceId, source = 'qr') {
  const { data, error } = await supabase.rpc('create_visit_secure', {
    p_qr_token: qrToken, p_commerce_id: commerceId, p_source: source,
  });
  if (error) throw error;
  return data;
}

// ─── INSCRIPTION COMMERÇANT ──────────────────────────────────

export async function creerDemandeCommercant({ nom_commerce, categorie, nom_ville, departement, adresse, telephone, email, avantage, siret }) {
  const insertData = {
    nom_commerce, categorie, nom_ville, departement: departement || null,
    adresse, telephone, email, avantage_propose: avantage,
    statut: 'en_attente',
  };
  if (siret) insertData.siret = siret;
  const { error } = await supabase.from('commercants_inscrits').insert(insertData);
  if (error) throw error;
  return { success: true };
}

export async function creerDemandeMairie({ nom_commune, code_postal, departement, population, nom_responsable, prenom_responsable, fonction, email, telephone, motivation, site_web, logo_url }) {
  const { error } = await supabase.from('mairies_inscrites').insert({
    nom_commune, code_postal, departement: departement || null,
    population: population || null,
    nom_responsable, prenom_responsable, fonction,
    email, telephone: telephone || null,
    motivation: motivation || null,
    site_web: site_web || null,
    logo_url: logo_url || null,
    statut: 'en_attente',
  });
  if (error) throw error;
  return { success: true };
}

// ─── RETRAIT COMMERCE ────────────────────────────────────────

export async function retirerCommerce(commerceId, token) {
  const { data, error } = await supabase.rpc('retirer_commerce', { p_commerce_id: commerceId, p_token: token });
  if (error) throw error;
  return data;
}

// ─── DASHBOARD ADMIN ─────────────────────────────────────────

export async function getAdminDashboard(villeSlug) {
  const { data, error } = await supabase.rpc('get_admin_dashboard', { p_ville_slug: villeSlug });
  if (error) throw error;
  return data;
}

export async function getTopClients(villeId, limit = 20) {
  const { data, error } = await supabase.rpc('get_top_clients_by_ville', { p_ville_id: villeId, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function getDemandesEnAttente() {
  const { data, error } = await supabase.from('commercants_inscrits')
    .select('id, nom_commerce, categorie, nom_ville, departement, adresse, telephone, email, avantage_propose, siret, statut, created_at').eq('statut', 'en_attente').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── AUTH ADMIN ──────────────────────────────────────────────

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Verify admin status
  const { data: admin } = await supabase.from('admins').select('id').eq('id', data.user.id).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    throw new Error('Ce compte n\'est pas administrateur.');
  }
  return data;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function adminAction(action, requestId) {
  const session = await getSession();
  if (!session) throw new Error('Non connecté');

  const res = await fetch('/api/admin-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, request_id: requestId, access_token: session.access_token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur serveur');
  }
  return res.json();
}

// ─── LISTE D'ATTENTE ─────────────────────────────────────────

export async function inscrireListeAttente(email, ville_slug) {
  const { error } = await supabase.from('liste_attente')
    .upsert({ email, ville_slug }, { onConflict: 'email,ville_slug' });
  if (error) throw error;
}

// ─── OFFRES & EVENEMENTS (lecture) ───────────────────────────

export async function getOffresVille(villeId) {
  const { data, error } = await supabase.from('offres')
    .select('*, commerces(nom)')
    .eq('ville_id', villeId).eq('actif', true).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEvenementsVille(villeId) {
  const { data, error } = await supabase.from('evenements')
    .select('id, titre, description, lieu, date_debut, date_fin, categorie, gratuit, prix, image_url, statut').eq('ville_id', villeId).eq('statut', 'publie')
    .gte('date_fin', new Date().toISOString())
    .order('date_debut');
  if (error) throw error;
  return data ?? [];
}

// ─── ESPACE RÉSIDENT ─────────────────────────────────────────

export async function getResidentProfile(numero, email) {
  const { data, error } = await supabase.rpc('get_resident_profile', { p_numero: numero, p_email: email });
  if (error) throw error;
  return data;
}

export async function createParrainageCode(carteId) {
  const { data, error } = await supabase.rpc('create_parrainage_code', { p_carte_id: carteId });
  if (error) throw error;
  return data;
}

export async function getRecommendations(carteId, limit = 5) {
  const { data, error } = await supabase.rpc('get_recommendations', { p_carte_id: carteId, p_limit: limit });
  if (error) throw error;
  return data ?? [];
}

// ─── ESPACE COMMERÇANT ───────────────────────────────────────

export async function getCommerceStats(commerceId, token) {
  const { data, error } = await supabase.rpc('get_commerce_stats', { p_commerce_id: commerceId, p_token: token });
  if (error) throw error;
  return data;
}
