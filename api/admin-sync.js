// api/admin-sync.js
// Description : Proxy sécurisé pour les endpoints de synchronisation SF/SR
// Méthode : POST
// Auth : Bearer token JWT Supabase (admin uniquement)

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, serverError } from './_utils.js';

const ALLOWED_ENDPOINTS = ['sync-projet', 'sync-evenement', 'notify-club'];
const rateLimit = createRateLimiter('admin-sync', { windowMs: 10000, max: 10 });

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimit(req, res)) return;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const syncApiKey = process.env.RR_SYNC_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !anonKey || !syncApiKey) {
    return res.status(500).json({ error: 'Serveur mal configuré.' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant.' });
    }
    const token = authHeader.split(' ')[1];

    const { createClient } = await import('@supabase/supabase-js');
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Token invalide.' });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: admin } = await serviceClient.from('admins').select('id').eq('id', user.id).maybeSingle();
    if (!admin) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
    }

    const { endpoint, ...data } = req.body;
    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      return res.status(400).json({ error: `Endpoint invalide. Valeurs acceptées : ${ALLOWED_ENDPOINTS.join(', ')}` });
    }

    const targetUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/${endpoint}`;
    const syncRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': syncApiKey,
      },
      body: JSON.stringify(data),
    });

    const result = await syncRes.json();
    return res.status(syncRes.status).json(result);

  } catch (error) {
    return serverError(res, error, 'admin-sync');
  }
}
