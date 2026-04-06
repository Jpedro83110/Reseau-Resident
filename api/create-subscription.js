// api/create-subscription.js
// Description : Crée un abonnement Stripe pour commerçant premium
// Méthode : POST
// Auth : Bearer token (JWT Supabase)

export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, serverError } from './_utils.js';

const rateLimit = createRateLimiter('create-subscription', { windowMs: 30000, max: 3 });

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
    const { commerce_id, plan, success_url, cancel_url } = req.body;
    if (!commerce_id || !plan) {
      return res.status(400).json({ error: 'commerce_id et plan requis.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant.' });
    }
    const token = authHeader.split(' ')[1];

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
    const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Token invalide.' });
    }

    const { data: commerce, error: commerceError } = await supabase
      .from('commerces')
      .select('id, nom, owner_id')
      .eq('id', commerce_id)
      .maybeSingle();

    if (commerceError || !commerce) {
      return res.status(404).json({ error: 'Commerce introuvable.' });
    }

    if (commerce.owner_id !== authUser.id) {
      return res.status(403).json({ error: 'Vous n\'êtes pas propriétaire de ce commerce.' });
    }

    const { data: userData } = await supabase.auth.admin.getUserById(commerce.owner_id);
    const email = userData?.user?.email;

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    let customerId;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        name: commerce.nom,
        metadata: { commerce_id, type: 'commercant_premium' },
      });
      customerId = customer.id;
    }

    const PLANS = {
      essentiel: process.env.STRIPE_PRICE_ESSENTIEL || 'price_essentiel',
      premium: process.env.STRIPE_PRICE_PREMIUM || 'price_premium',
    };

    const priceId = PLANS[plan];
    if (!priceId) {
      return res.status(400).json({ error: `Plan inconnu: ${plan}` });
    }

    const appUrl = process.env.APP_URL || req.headers.origin || 'https://reseaux-resident.fr';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${appUrl}/mon-commerce?premium=success`,
      cancel_url: cancel_url || `${appUrl}/mon-commerce?premium=cancel`,
      allow_promotion_codes: true,
      metadata: { commerce_id, plan },
      subscription_data: {
        metadata: { commerce_id, plan },
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return serverError(res, error, 'create-subscription');
  }
}
