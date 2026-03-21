export const config = { runtime: 'nodejs' };

const PRICES = {
  individuel: 1000,
  couple: 1500,
  secondaire: 2000,
};

// Simple in-memory rate limit (resets on cold start, good enough for anti-spam)
const recentRequests = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 1 request per IP per 30 seconds
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const last = recentRequests.get(ip);
  if (last && now - last < 30000) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans 30 secondes.' });
  }
  recentRequests.set(ip, now);
  // Cleanup old entries
  if (recentRequests.size > 1000) {
    for (const [k, v] of recentRequests) { if (now - v > 60000) recentRequests.delete(k); }
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const { formule, email, carte_id } = req.body;
    if (!formule || !email || !carte_id) return res.status(400).json({ error: 'Missing fields' });

    const montant = PRICES[formule];
    if (!montant) return res.status(400).json({ error: `Formule inconnue: ${formule}` });

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: montant,
      currency: 'eur',
      receipt_email: email,
      description: `Carte Résident — ${formule}`,
      metadata: { carte_id, formule },
      automatic_payment_methods: { enabled: true },
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe error:', error.message);
    return res.status(500).json({ error: error.message || 'Payment failed' });
  }
}
