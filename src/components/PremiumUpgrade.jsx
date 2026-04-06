// src/components/PremiumUpgrade.jsx
// Module d'upgrade Premium pour commerçants — affichage des plans et redirection Stripe
import { useState } from 'react';
import { Crown, Check, BarChart2, Megaphone, Bell, Star, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PLANS = [
  {
    id: 'essentiel',
    nom: 'Essentiel',
    prix: '9,90',
    features: [
      { icon: BarChart2, text: 'Statistiques avancées (tendances, profils résidents)' },
      { icon: Star, text: 'Badge "commerce engagé" sur votre fiche' },
      { icon: Megaphone, text: 'Mise en avant dans le fil résidents' },
    ],
  },
  {
    id: 'premium',
    nom: 'Premium',
    prix: '14,90',
    populaire: true,
    features: [
      { icon: BarChart2, text: 'Statistiques avancées complètes' },
      { icon: Star, text: 'Badge "commerce engagé"' },
      { icon: Megaphone, text: 'Mise en avant prioritaire' },
      { icon: Bell, text: 'Notifications push ciblées (1/semaine)' },
      { icon: Zap, text: 'Campagne hors saison (boost visibilité)' },
      { icon: Crown, text: 'Sponsoring projets associatifs locaux' },
    ],
  },
];

export default function PremiumUpgrade({ commerceId, isPremium }) {
  const [isRedirecting, setIsRedirecting] = useState(null);

  async function handleUpgrade(plan) {
    try {
      setIsRedirecting(plan);
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          commerce_id: commerceId,
          plan,
          success_url: `${window.location.origin}/mon-commerce?premium=success`,
          cancel_url: `${window.location.origin}/mon-commerce?premium=cancel`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Erreur subscription:', data.error);
        setIsRedirecting(null);
      }
    } catch (err) {
      console.error('Erreur upgrade:', err);
      setIsRedirecting(null);
    }
  }

  if (isPremium) {
    return (
      <div className="bg-gradient-to-r from-or/10 to-or-clair/10 border border-or/30 rounded-xl p-6 text-center">
        <Crown size={28} className="text-or mx-auto mb-3" />
        <h3 className="font-serif text-lg font-bold text-texte mb-1">Vous êtes Premium</h3>
        <p className="text-sm text-gray-500">Profitez de toutes les fonctionnalités avancées de Réseaux-Résident.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Crown size={32} className="text-or mx-auto mb-3" />
        <h2 className="font-serif text-2xl font-bold text-texte mb-2">Passez Premium</h2>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Boostez la visibilité de votre commerce et accédez aux outils avancés pour développer votre activité locale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-xl border-2 p-6 transition-all ${
              plan.populaire ? 'border-or shadow-md' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {plan.populaire && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-or text-white text-xs font-bold rounded-full">
                Populaire
              </span>
            )}

            <h3 className="font-serif text-lg font-bold text-texte mb-1">{plan.nom}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-texte">{plan.prix}€</span>
              <span className="text-sm text-gray-400">/mois</span>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <Icon size={16} className="text-or shrink-0 mt-0.5" />
                  {text}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={isRedirecting !== null}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
                plan.populaire
                  ? 'bg-or text-white hover:bg-or-clair'
                  : 'bg-bleu text-white hover:bg-bleu-clair'
              } disabled:opacity-60`}
            >
              {isRedirecting === plan.id ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Crown size={16} />
              )}
              Choisir {plan.nom}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Annulation possible à tout moment. L'abonnement prend fin à la date de renouvellement.
      </p>
    </div>
  );
}
