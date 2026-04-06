import { Link } from 'react-router-dom';
import { MapPin, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-bleu text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 py-14">
          <div className="lg:col-span-1">
            <Link to="/" className="font-serif text-2xl font-bold text-white">
              Réseaux-Résident
            </Link>
            <p className="text-white/60 mt-4 leading-relaxed text-sm max-w-xs">
              La plateforme qui connecte résidents, commerçants, associations et mairies pour faire vivre votre territoire.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-white/50">
              <MapPin size={14} />
              <span>Sanary-sur-Mer, Var, France</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-or mb-4">Plateforme</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/" className="text-white/70 hover:text-white transition-colors">Accueil</Link></li>
              <li><Link to="/commercants" className="text-white/70 hover:text-white transition-colors">Commerces partenaires</Link></li>
              <li><Link to="/inscription-compte" className="text-white/70 hover:text-white transition-colors">Créer un compte</Link></li>
              <li><Link to="/connexion" className="text-white/70 hover:text-white transition-colors">Se connecter</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-or mb-4">Rejoindre</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/commercants/rejoindre" className="text-white/70 hover:text-white transition-colors">Inscrire mon commerce</Link></li>
              <li><Link to="/associations/rejoindre" className="text-white/70 hover:text-white transition-colors">Inscrire une association</Link></li>
              <li><Link to="/mairie/inscription" className="text-white/70 hover:text-white transition-colors">Inscrire ma commune</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-or mb-4">Informations</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/cgv" className="text-white/70 hover:text-white transition-colors">Conditions générales</Link></li>
              <li><Link to="/confidentialite" className="text-white/70 hover:text-white transition-colors">Confidentialité</Link></li>
              <li>
                <a href="mailto:contact@reseaux-resident.fr" className="text-white/70 hover:text-white transition-colors flex items-center gap-2">
                  <Mail size={13} /> Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10" />

        <div className="py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-xs">© {currentYear} Réseaux-Résident. Tous droits réservés.</p>
          <p className="text-white/40 text-xs">Conçu avec soin dans le Var, France</p>
        </div>
      </div>
    </footer>
  );
}
