// api/_utils.js
// Utilitaires partagés pour les serverless functions Vercel
// CORS sécurisé, rate limiting, comparaison timing-safe

import { timingSafeEqual } from 'crypto';

// ── CORS ──
const ALLOWED_ORIGINS = [
  'https://reseaux-resident.fr',
  'https://www.reseaux-resident.fr',
];

// En dev, autoriser localhost
if (process.env.VERCEL_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:5173');
}

/**
 * Configure les headers CORS sécurisés.
 * Retourne true si c'est une requête OPTIONS (preflight) — le handler doit return immédiatement.
 */
export function handleCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// ── Rate Limiting (in-memory, reset au cold start) ──
const rateLimitStores = new Map();

/**
 * Rate limiter simple par IP.
 * @param {string} name — Nom du store (un par endpoint)
 * @param {number} windowMs — Fenêtre en ms (défaut 30s)
 * @param {number} max — Max requêtes par fenêtre (défaut 5)
 * @returns {function} middleware(req, res) → true si bloqué
 */
export function createRateLimiter(name, { windowMs = 30000, max = 5 } = {}) {
  if (!rateLimitStores.has(name)) {
    rateLimitStores.set(name, new Map());
  }
  const store = rateLimitStores.get(name);

  return function rateLimit(req, res) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    // Nettoyage périodique
    if (store.size > 1000) {
      for (const [k, v] of store) {
        if (now - v.start > windowMs) store.delete(k);
      }
    }

    const record = store.get(ip);
    if (record && now - record.start < windowMs) {
      record.count++;
      if (record.count > max) {
        res.status(429).json({ error: 'Trop de requêtes. Réessayez dans quelques secondes.' });
        return true;
      }
    } else {
      store.set(ip, { start: now, count: 1 });
    }
    return false;
  };
}

// ── Comparaison timing-safe pour clés API ──

/**
 * Compare deux chaînes en temps constant pour éviter les timing attacks.
 */
export function safeCompare(a, b) {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    if (bufA.length !== bufB.length) {
      // Comparer avec un buffer de même taille pour maintenir le temps constant
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// ── Réponse d'erreur sécurisée ──

/**
 * Log l'erreur côté serveur et renvoie un message générique au client.
 */
export function serverError(res, error, context = 'API') {
  console.error(`Erreur ${context}:`, error);
  return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
}
