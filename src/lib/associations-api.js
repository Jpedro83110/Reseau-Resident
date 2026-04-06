// src/lib/associations-api.js
// Client API Associations (RNA) — vérification / récupération infos par numéro RNA
// Doc : https://entreprise.api.gouv.fr/v4/djepva/api-association

const BASE_URL = 'https://entreprise.api.gouv.fr/v4/djepva/api-association';

/**
 * Rechercher une association par numéro RNA (ex: W123456789)
 * @param {string} rna — numéro RNA (format Wxxxxxxxxx)
 * @returns {object|null} — infos association
 */
export async function rechercherParRNA(rna) {
  const rnaClean = rna.trim().toUpperCase();
  if (!/^W\d{9}$/.test(rnaClean)) {
    throw new Error('Le numéro RNA doit être au format W suivi de 9 chiffres (ex: W123456789).');
  }

  const res = await fetch(`${BASE_URL}/associations/${rnaClean}`, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 404) return null;
  if (res.status === 429) throw new Error('Trop de requêtes. Réessayez dans quelques secondes.');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Erreur API Associations (${res.status}): ${text}`);
  }

  const data = await res.json();
  const asso = data.association ?? data;

  // Adresse complète
  const adresseParts = asso.adresse_siege
    ? [
        asso.adresse_siege.numero_voie,
        asso.adresse_siege.type_voie,
        asso.adresse_siege.libelle_voie,
      ].filter(Boolean)
    : [];
  const cp = asso.adresse_siege?.code_postal ?? '';
  const commune = asso.adresse_siege?.commune ?? '';
  const adresseComplete = adresseParts.length > 0
    ? `${adresseParts.join(' ')}, ${cp} ${commune}`.trim()
    : cp ? `${cp} ${commune}`.trim() : null;

  return {
    rna: asso.id_association ?? rnaClean,
    siret: asso.siret ?? null,
    nom: asso.titre ?? asso.nom ?? 'Inconnu',
    objet: asso.objet ?? null,
    adresse: adresseComplete,
    codePostal: cp,
    commune,
    dateCreation: asso.date_creation ?? null,
    datePublication: asso.date_publication_creation ?? null,
    active: asso.id_association != null,
    categorie: asso.groupement ?? null,
    siteWeb: asso.site_web ?? null,
    email: asso.email ?? null,
    telephone: asso.telephone ?? null,
  };
}

/**
 * Rechercher des associations par nom (texte libre)
 * @param {string} query — terme de recherche
 * @param {string} codePostal — filtre optionnel par code postal
 * @param {number} limit — nombre max de résultats
 * @returns {Array}
 */
export async function rechercherParNom(query, codePostal = '', limit = 5) {
  if (!query || query.length < 2) return [];

  const params = new URLSearchParams({ nom: query, per_page: String(limit) });
  if (codePostal) params.set('code_postal', codePostal);

  const res = await fetch(`${BASE_URL}/associations?${params}`, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 404) return [];
  if (!res.ok) return [];

  const data = await res.json();
  return (data.associations ?? data ?? []).slice(0, limit).map((asso) => ({
    rna: asso.id_association ?? null,
    nom: asso.titre ?? asso.nom ?? '',
    objet: asso.objet ?? null,
    commune: asso.adresse_siege?.commune ?? null,
    codePostal: asso.adresse_siege?.code_postal ?? null,
  }));
}
