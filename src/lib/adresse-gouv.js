/**
 * adresse-gouv.js — Client pour l'API Adresse du gouvernement français
 * https://adresse.data.gouv.fr/api-doc/adresse
 *
 * Deux usages :
 * 1. rechercherAdresse(query) → autocomplétion d'adresses postales
 * 2. rechercherVille(query)   → autocomplétion de communes (municipalities)
 */

const BASE_URL = 'https://api-adresse.data.gouv.fr';

/**
 * Recherche d'adresses postales complètes
 * @param {string} query - Ex: "12 rue de la république sanary"
 * @param {object} options
 * @param {number} options.limit - Nombre max de résultats (défaut: 5)
 * @param {string} options.postcode - Filtrer par code postal
 * @returns {Promise<Array<{label, housenumber, street, postcode, city, context, lat, lon}>>}
 */
export async function rechercherAdresse(query, { limit = 5, postcode } = {}) {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    type: 'housenumber',
  });
  if (postcode) params.set('postcode', postcode);

  try {
    const res = await fetch(`${BASE_URL}/search/?${params}`);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features ?? []).map((f) => ({
      label: f.properties.label,
      housenumber: f.properties.housenumber || '',
      street: f.properties.street || '',
      postcode: f.properties.postcode || '',
      city: f.properties.city || '',
      citycode: f.properties.citycode || '',
      context: f.properties.context || '', // ex: "83, Var, Provence-Alpes-Côte d'Azur"
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
    }));
  } catch {
    return [];
  }
}

/**
 * Recherche de communes (villes)
 * @param {string} query - Ex: "sanary", "toulon", "83"
 * @param {object} options
 * @param {number} options.limit - Nombre max de résultats (défaut: 8)
 * @returns {Promise<Array<{nom, codePostal, codeDepartement, departement, region, lat, lon}>>}
 */
export async function rechercherVille(query, { limit = 8 } = {}) {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
    type: 'municipality',
  });

  try {
    const res = await fetch(`${BASE_URL}/search/?${params}`);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features ?? []).map((f) => {
      const ctx = (f.properties.context || '').split(', ');
      return {
        nom: f.properties.city || f.properties.name || '',
        codePostal: f.properties.postcode || '',
        codeDepartement: ctx[0] || '',
        departement: ctx[1] || '',
        region: ctx[2] || '',
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
      };
    });
  } catch {
    return [];
  }
}
