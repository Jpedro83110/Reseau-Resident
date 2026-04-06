// api/cancel-subscription.js
// Description : Annule l'abonnement premium d'un commerçant
// Méthode : POST
// Auth : Bearer token (JWT Supabase)

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, serverError } from './_utils.js';

const rateLimit = createRateLimiter('cancel-subscription', { windowMs: 30000, max: 3 });

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimit(req, res)) return;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Serveur mal configuré.' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant.' });
    }
    const token = authHeader.split(' ')[1];

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Token invalide.' });
    }

    const { commerce_id } = req.body;
    if (!commerce_id) {
      return res.status(400).json({ error: 'commerce_id requis.' });
    }

    const { data: commerce } = await supabase
      .from('commerces')
      .select('id, owner_id, stripe_subscription_id')
      .eq('id', commerce_id)
      .maybeSingle();

    if (!commerce) {
      return res.status(404).json({ error: 'Commerce introuvable.' });
    }

    if (commerce.owner_id !== user.id) {
      return res.status(403).json({ error: 'Vous n\'êtes pas propriétaire de ce commerce.' });
    }

    if (!commerce.stripe_subscription_id) {
      return res.status(400).json({ error: 'Aucun abonnement actif.' });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    await stripe.subscriptions.update(commerce.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return res.status(200).json({ success: true, message: 'Abonnement annulé en fin de période.' });
  } catch (error) {
    return serverError(res, error, 'cancel-subscription');
  }
}
