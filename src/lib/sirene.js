// src/lib/sirene.js
// Client pour la recherche SIRET — appelle le proxy serveur /api/sirene-lookup
// La clé API INSEE reste côté serveur (jamais exposée dans le bundle frontend)

/**
 * Mapping code NAF → catégorie commerce Réseaux-Résident
 */
const NAF_CATEGORIES = {
  '10.71': 'Boulangerie / Pâtisserie',
  '10.72': 'Boulangerie / Pâtisserie',
  '47.24': 'Boulangerie / Pâtisserie',
  '47.11': 'Alimentation / Épicerie',
  '47.21': 'Alimentation / Épicerie',
  '47.29': 'Alimentation / Épicerie',
  '56.10': 'Restauration / Bar / Café',
  '56.21': 'Restauration / Bar / Café',
  '56.30': 'Restauration / Bar / Café',
  '47.71': 'Mode / Beauté / Bien-être',
  '47.72': 'Mode / Beauté / Bien-être',
  '96.02': 'Mode / Beauté / Bien-être',
  '96.04': 'Mode / Beauté / Bien-être',
  '47.59': 'Maison / Décoration',
  '47.54': 'Maison / Décoration',
};

/**
 * Convertit un code NAF en catégorie commerce
 */
export function mapNafToCategorie(naf) {
  if (!naf) return '';
  const code = naf.replace(/[A-Za-z]$/, '');
  if (NAF_CATEGORIES[code]) return NAF_CATEGORIES[code];
  const prefix4 = code.slice(0, 4);
  for (const [k, v] of Object.entries(NAF_CATEGORIES)) {
    if (k.startsWith(prefix4)) return v;
  }
  return '';
}

/**
 * Rechercher un établissement par SIRET via le proxy serveur
 * @param {string} siret — 14 chiffres
 * @returns {object|null} — infos établissement
 */
export async function rechercherParSiret(siret) {
  const siretClean = siret.replace(/\s/g, '');
  if (siretClean.length !== 14 || !/^\d+$/.test(siretClean)) {
    throw new Error('Le SIRET doit contenir exactement 14 chiffres.');
  }

  const res = await fetch('/api/sirene-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siret: siretClean }),
  });

  if (res.status === 429) throw new Error('Trop de requêtes. Réessayez dans quelques secondes.');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur serveur (${res.status})`);
  }

  const { data: etab } = await res.json();
  if (!etab) return null;

  const adresseData = etab.adresseEtablissement;
  const unite = etab.uniteLegale;
  const naf = etab.activitePrincipaleEtablissement ?? unite?.activitePrincipaleUniteLegale ?? null;

  return {
    siret: etab.siret,
    siren: etab.siren,
    nom: unite?.denominationUniteLegale
      || etab.enseigneEtablissement
      || `${unite?.prenomUsuelUniteLegale ?? ''} ${unite?.nomUniteLegale ?? ''}`.trim()
      || 'Inconnu',
    enseigne: etab.enseigneEtablissement ?? null,
    activite: naf,
    categorie: mapNafToCategorie(naf),
    adresse: [
      adresseData?.numeroVoieEtablissement,
      adresseData?.typeVoieEtablissement,
      adresseData?.libelleVoieEtablissement,
    ].filter(Boolean).join(' ') || null,
    codePostal: adresseData?.codePostalEtablissement ?? null,
    commune: adresseData?.libelleCommuneEtablissement ?? null,
    actif: etab.etatAdministratifEtablissement === 'A',
    dateCreation: etab.dateCreationEtablissement ?? null,
  };
}

/**
 * Rechercher des entreprises par nom via le proxy serveur
 * @param {string} query — terme de recherche
 * @param {number} limit — nombre max de résultats
 * @returns {Array}
 */
export async function rechercherParNom(query, limit = 5) {
  if (!query || query.length < 2) return [];

  const res = await fetch('/api/sirene-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom: query, limit }),
  });

  if (!res.ok) return [];

  const { data } = await res.json();
  return (data ?? []).map((etab) => {
    const adresse = etab.adresseEtablissement;
    const unite = etab.uniteLegale;
    return {
      siret: etab.siret,
      siren: etab.siren,
      nom: unite?.denominationUniteLegale
        || `${unite?.prenomUsuelUniteLegale ?? ''} ${unite?.nomUniteLegale ?? ''}`.trim(),
      enseigne: etab.enseigneEtablissement ?? null,
      codePostal: adresse?.codePostalEtablissement ?? null,
      commune: adresse?.libelleCommuneEtablissement ?? null,
      actif: etab.etatAdministratifEtablissement === 'A',
    };
  });
}
