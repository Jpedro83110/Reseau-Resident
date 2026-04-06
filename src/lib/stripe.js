import { loadStripe } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!publishableKey) {
  console.error(
    '[Réseaux-Résident] Variable manquante : VITE_STRIPE_PUBLISHABLE_KEY. ' +
    'Copiez .env.example → .env.local et renseignez votre clé publique Stripe.'
  );
}

// loadStripe tolère undefined — retournera null, les composants Stripe afficheront une erreur
export const stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);

export const STRIPE_PRICES = {
  individuel: { label: 'Carte Individuelle', montant: 1000, cartes: 1 },
  couple:     { label: 'Carte Couple',       montant: 1500, cartes: 2 },
  secondaire: { label: 'Résident Secondaire', montant: 2000, cartes: 1 },
};
