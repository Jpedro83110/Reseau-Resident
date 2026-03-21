// api/create-payment-intent.js
// Vercel Serverless Function pour créer un PaymentIntent Stripe
// 
// IMPORTANT : Ajoutez STRIPE_SECRET_KEY dans les variables d'environnement Vercel
// (sans le préfixe VITE_ car c'est une clé secrète côté serveur)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not set');
    return res.status(500).json({ error: 'Configuration error' });
  }

  try {
    const { montant, email, carte_id, description } = req.body;

    if (!montant || !email || !carte_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Dynamically import Stripe to avoid issues with edge runtime
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: montant, // Montant en centimes
      currency: 'eur',
      receipt_email: email,
      description: description || 'Carte Résident',
      metadata: {
        carte_id: carte_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({
      error: error.message || 'Payment creation failed',
    });
  }
}
