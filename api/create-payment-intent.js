export const config = { runtime: 'nodejs' };

// Prix définis côté SERVEUR — impossible à manipuler depuis le navigateur
const PRICES = {
  individuel: 1000, // 10.00€
  couple: 1500,     // 15.00€
  secondaire: 2000, // 20.00€
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY not set');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  try {
    const { formule, email, carte_id } = req.body;

    if (!formule || !email || !carte_id) {
      return res.status(400).json({ error: 'Missing: formule, email, carte_id' });
    }

    // Vérification côté serveur du montant
    const montant = PRICES[formule];
    if (!montant) {
      return res.status(400).json({ error: `Formule inconnue: ${formule}` });
    }

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
