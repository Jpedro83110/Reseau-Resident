import { Check, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const TARIFS = [
  { id: 'individuel', label: 'Individuel', prix: 10, cartes: 1, featured: false, avantages: ['1 carte physique ou digitale', 'Tous les commerces partenaires', 'Avantages illimités', 'Valable 1 an'] },
  { id: 'couple', label: 'Couple', prix: 15, cartes: 2, featured: true, avantages: ['2 cartes physiques ou digitales', 'Tous les commerces partenaires', 'Avantages illimités', 'Économisez 5€'] },
  { id: 'secondaire', label: 'Résident secondaire', prix: 20, cartes: 1, featured: false, avantages: ['1 carte physique ou digitale', 'Tous les commerces partenaires', 'Soutenez votre ville de cœur', 'Valable toute l\'année'] },
];

export default function TarifsSection() {
  return (
    <section id="tarifs" className="py-24 bg-bleu text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">Des tarifs simples et transparents</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">Un abonnement annuel unique pour soutenir votre ville et profiter d'avantages toute l'année.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {TARIFS.map((tarif) => (
            <div key={tarif.id} className={`relative rounded-3xl p-8 flex flex-col ${tarif.featured ? 'bg-or text-white shadow-[0_20px_40px_rgba(200,150,62,0.3)] lg:-translate-y-4' : 'bg-white/10 text-white border border-white/20'}`}>
              {tarif.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-or text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">Le plus choisi</div>
              )}
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-3">{tarif.label}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">{tarif.prix}€</span>
                  <span className="text-sm opacity-70">/ an</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                {tarif.avantages.map((av, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={18} className="shrink-0 mt-0.5 opacity-90" />
                    <span className="opacity-90">{av}</span>
                  </li>
                ))}
              </ul>
              <Link to={`/inscription?formule=${tarif.id}`}
                className={`w-full py-4 rounded-xl font-bold text-center transition-colors block ${tarif.featured ? 'bg-white text-or hover:bg-gray-50' : 'bg-or text-white hover:bg-or-clair'}`}>
                Choisir cette formule
              </Link>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-white/5 rounded-2xl p-8 border border-white/10">
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-serif text-2xl font-bold mb-2">Vous préférez commander par téléphone ?</h3>
            <p className="text-blue-100">Paiement par chèque ou virement accepté. Livraison sous 5 jours.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 px-6 py-4 rounded-xl border border-white/20 shrink-0">
            <Phone size={32} className="text-or-clair" />
            <div>
              <div className="text-sm text-blue-200 uppercase tracking-wider font-semibold mb-1">Appel gratuit</div>
              <a href="tel:0494000000" className="text-2xl font-bold hover:text-or-clair transition-colors">04 94 00 00 00</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
