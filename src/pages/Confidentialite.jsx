import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Confidentialite() {
  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-bleu font-medium mb-8 transition-colors">
          <ArrowLeft size={20} aria-hidden="true" /> Retour à l'accueil
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12">
          <h1 className="font-serif text-4xl font-bold text-texte mb-8">Politique de Confidentialité</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : Mars 2025</p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles collectées sur ce site est :
              Carte Résident, dont le siège est situé à Sanary-sur-Mer (83110), France.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">2. Données collectées</h2>
            <p>
              Dans le cadre de l'inscription à la Carte Résident, nous collectons les données suivantes :
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Données d'identification :</strong> prénom, nom, adresse email</li>
              <li><strong>Données de contact :</strong> numéro de téléphone (optionnel), adresse postale</li>
              <li><strong>Données de paiement :</strong> traitées exclusivement par Stripe (nous ne stockons pas vos données bancaires)</li>
            </ul>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">3. Finalités du traitement</h2>
            <p>Vos données sont utilisées exclusivement pour :</p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>L'émission et l'envoi de votre carte physique</li>
              <li>La gestion de votre abonnement et son renouvellement</li>
              <li>La communication d'informations relatives au programme</li>
            </ul>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">4. Statistiques anonymisées</h2>
            <p>
              Les visites enregistrées chez les commerçants partenaires sont <strong>anonymisées</strong>. 
              Aucune donnée personnelle n'est associée aux statistiques de fréquentation. 
              Nous collectons uniquement : l'identifiant de carte (non nominatif), le commerce visité, 
              et la date de visite.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">5. Durée de conservation</h2>
            <p>
              Vos données personnelles sont conservées pendant la durée de validité de votre carte, 
              puis 3 ans après expiration pour des raisons comptables et légales. 
              Les données de visite anonymisées sont conservées sans limitation de durée.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">6. Partage des données</h2>
            <p>
              Vos données personnelles ne sont jamais vendues ni partagées avec des tiers à des fins 
              commerciales. Elles peuvent être communiquées à nos sous-traitants techniques 
              (hébergement, paiement) dans le strict cadre de leurs missions.
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">7. Vos droits</h2>
            <p>
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, contactez-nous à : <strong>privacy@carte-resident.fr</strong>
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour 
              protéger vos données contre tout accès non autorisé, modification, divulgation ou 
              destruction. Les données sont hébergées sur des serveurs sécurisés (Supabase, Vercel).
            </p>

            <h2 className="font-serif text-2xl font-bold text-texte mt-8 mb-4">9. Contact</h2>
            <p>
              Pour toute question relative à cette politique de confidentialité :
            </p>
            <ul className="list-none mt-4 space-y-2">
              <li>📞 Téléphone : 04 94 00 00 00</li>
              <li>✉️ Email : privacy@carte-resident.fr</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
