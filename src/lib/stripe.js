import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('VITE_STRIPE_PUBLISHABLE_KEY manquant dans .env.local');
}

export const stripePromise = loadStripe(publishableKey);

export const STRIPE_PRICES = {
  individuel: { label: 'Carte Individuelle', montant: 1000, cartes: 1 },
  couple:     { label: 'Carte Couple',       montant: 1500, cartes: 2 },
  secondaire: { label: 'Résident Secondaire', montant: 2000, cartes: 1 },
};
