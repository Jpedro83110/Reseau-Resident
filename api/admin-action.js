export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, serverError } from './_utils.js';

const rateLimit = createRateLimiter('admin-action', { windowMs: 10000, max: 10 });

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimit(req, res)) return;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return res.status(500).json({ error: 'Serveur mal configuré.' });

  try {
    const { action, request_id, access_token } = req.body;
    if (!action || !request_id || !access_token) {
      return res.status(400).json({ error: 'Champs requis : action, request_id, access_token' });
    }

    const { createClient } = await import('@supabase/supabase-js');

    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!anonKey) return res.status(500).json({ error: 'Serveur mal configuré.' });
    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(access_token);
    if (authError || !user) return res.status(401).json({ error: 'Non autorisé.' });

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: admin } = await serviceClient.from('admins').select('id').eq('id', user.id).maybeSingle();
    if (!admin) return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });

    if (action === 'approve') {
      const { data } = await serviceClient.rpc('approve_commercant_request', { p_request_id: request_id });
      return res.status(200).json(data || { success: true });
    } else if (action === 'refuse') {
      const { data } = await serviceClient.rpc('refuse_commercant_request', { p_request_id: request_id });
      return res.status(200).json({ success: !!data });
    } else {
      return res.status(400).json({ error: `Action inconnue : ${action}` });
    }
  } catch (error) {
    return serverError(res, error, 'admin-action');
  }
}
