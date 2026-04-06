import { Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CartesCadeaux() {
  return (
    <section id="cartes-cadeaux" className="py-24 bg-gris-clair">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm text-or mb-8">
          <Gift size={32} />
        </div>
        <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6">Offrir une carte à vos proches</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Faites découvrir les commerces de votre ville à un ami, un voisin ou un membre de votre famille en lui offrant une Réseaux-Résident.
        </p>
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-gray-100 shadow-sm max-w-xl mx-auto mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { formule: 'individuel', nom: 'Individuel', prix: '10€', label: '1 carte' },
              { formule: 'couple', nom: 'Couple', prix: '15€', label: '2 cartes' },
              { formule: 'secondaire', nom: 'Rés. secondaire', prix: '20€', label: '1 carte' },
            ].map((f) => (
              <Link key={f.formule} to={`/inscription?formule=${f.formule}`}
                className="rounded-2xl bg-gradient-to-br from-bleu to-bleu-clair p-4 sm:p-5 flex flex-col items-center justify-center shadow-lg hover:-translate-y-1 transition-transform text-white min-h-[120px]">
                <div className="text-xs text-white font-bold uppercase tracking-wider mb-2">{f.nom}</div>
                <div className="font-serif text-3xl font-bold">{f.prix}</div>
                <div className="text-xs text-blue-200 mt-1">{f.label}</div>
              </Link>
            ))}
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Choisissez une formule, renseignez les coordonnées du bénéficiaire, et la carte sera envoyée directement.
          </p>
        </div>
        <Link to="/inscription" className="inline-flex items-center gap-2 px-8 py-4 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors shadow-md">
          <Gift size={20} /> Offrir une Réseaux-Résident
        </Link>
      </div>
    </section>
  );
}
