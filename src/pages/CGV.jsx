import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CGV() {
  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-bleu font-medium mb-8 transition-colors">
          <ArrowLeft size={20} aria-hidden="true" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
          <h1 className="font-serif text-4xl font-bold text-texte mb-8">Conditions Générales de Vente</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : Mars 2025</p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 1 - Objet</h2>
            <p>
              Les présentes conditions générales de vente (CGV) régissent les relations contractuelles entre 
              Carte Résident et toute personne physique effectuant un achat de carte de fidélité locale via 
              le site internet carte-resident.fr ou par tout autre canal de distribution.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 2 - Description du service</h2>
            <p>
              La Carte Résident est une carte de fidélité locale permettant à son détenteur de bénéficier 
              d'avantages auprès des commerces partenaires de sa ville. Les avantages varient selon les 
              commerces et sont affichés sur le site ainsi que dans les établissements partenaires.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 3 - Prix et paiement</h2>
            <p>
              Les prix sont indiqués en euros TTC. Le paiement s'effectue au moment de la commande par 
              carte bancaire via notre prestataire sécurisé Stripe, ou par chèque/virement sur demande.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Carte Individuelle : 10€/an</li>
              <li>Carte Couple (2 cartes) : 15€/an</li>
              <li>Carte Famille (4 cartes) : 20€/an</li>
              <li>Carte Résident Secondaire (2 cartes) : 20€/an</li>
            </ul>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 4 - Livraison</h2>
            <p>
              La carte physique est envoyée par courrier postal sous 5 jours ouvrés à l'adresse indiquée 
              lors de la commande, ou disponible en retrait chez un commerçant partenaire. 
              Les frais de livraison sont offerts.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 5 - Durée de validité</h2>
            <p>
              La Carte Résident est valable 12 mois à compter de la date d'achat. Elle peut être 
              renouvelée chaque année au tarif en vigueur.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 6 - Droit de rétractation</h2>
            <p>
              Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 
              14 jours à compter de la réception de votre carte pour exercer votre droit de rétractation 
              sans avoir à justifier de motifs ni à payer de pénalités.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 7 - Responsabilité</h2>
            <p>
              Carte Résident ne peut être tenue responsable en cas de modification, suspension ou 
              suppression d'un avantage par un commerçant partenaire. Les avantages sont définis 
              librement par chaque commerce.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">Article 8 - Contact</h2>
            <p>
              Pour toute question relative à votre commande ou à l'utilisation de votre carte :
            </p>
            <ul className="list-none mt-4 space-y-2">
              <li>📞 Téléphone : 04 94 00 00 00</li>
              <li>✉️ Email : contact@carte-resident.fr</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
