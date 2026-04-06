export const config = { runtime: 'nodejs' };

import { handleCors, createRateLimiter, serverError } from './_utils.js';

const PRICES = {
  individuel: 1000,
  couple: 1500,
  secondaire: 2000,
};

const rateLimit = createRateLimiter('create-payment-intent', { windowMs: 30000, max: 1 });

export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (rateLimit(req, res)) return;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return res.status(500).json({ error: 'Serveur mal configuré.' });

  try {
    const { formule, email, carte_id, ville_id } = req.body;
    if (!formule || !email || !carte_id) return res.status(400).json({ error: 'Champs requis : formule, email, carte_id' });

    const montant = PRICES[formule];
    if (!montant) return res.status(400).json({ error: `Formule inconnue : ${formule}` });

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: montant,
      currency: 'eur',
      receipt_email: email,
      description: `Réseaux-Résident — ${formule}`,
      metadata: { carte_id, formule, ville_id: ville_id || '' },
      automatic_payment_methods: { enabled: true },
    }, {
      idempotencyKey: `pi_${carte_id}_${formule}`,
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    return serverError(res, error, 'create-payment-intent');
  }
}
