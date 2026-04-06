// api/sirene-lookup.js
// Description : Proxy sécurisé pour l'API Sirene INSEE — la clé API reste côté serveur
// Méthode : POST
// Auth : Aucune (endpoint public, rate-limité)

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, serverError } from './_utils.js';

const BASE_URL = 'https://api.insee.fr/entreprises/sirene/V3.11';
const rateLimit = createRateLimiter('sirene-lookup', { windowMs: 10000, max: 3 });

// Échappement des caractères spéciaux Lucene pour éviter l'injection de requête
function escapeLucene(str) {
  return str.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimit(req, res)) return;

  const apiKey = process.env.INSEE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Serveur mal configuré.' });

  try {
    const { siret, nom, limit } = req.body;

    if (siret) {
      const clean = siret.replace(/\s/g, '');
      if (clean.length !== 14 || !/^\d+$/.test(clean)) {
        return res.status(400).json({ error: 'Le SIRET doit contenir exactement 14 chiffres.' });
      }

      const response = await fetch(`${BASE_URL}/siret/${clean}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });

      if (response.status === 404) return res.status(200).json({ data: null });
      if (response.status === 429) return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans quelques secondes.' });
      if (!response.ok) return res.status(502).json({ error: 'Erreur lors de la consultation du registre.' });

      const json = await response.json();
      return res.status(200).json({ data: json.etablissement ?? null });

    } else if (nom) {
      if (nom.length < 2) return res.status(400).json({ error: 'Minimum 2 caractères.' });

      const safeName = escapeLucene(nom);
      const params = new URLSearchParams({
        q: `denominationUniteLegale:"${safeName}"`,
        nombre: String(Math.min(limit || 5, 20)),
      });

      const response = await fetch(`${BASE_URL}/siret?${params}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });

      if (response.status === 404) return res.status(200).json({ data: [] });
      if (!response.ok) return res.status(502).json({ error: 'Erreur lors de la consultation du registre.' });

      const json = await response.json();
      return res.status(200).json({ data: json.etablissements ?? [] });

    } else {
      return res.status(400).json({ error: 'Paramètre siret ou nom requis.' });
    }
  } catch (error) {
    return serverError(res, error, 'sirene-lookup');
  }
}
