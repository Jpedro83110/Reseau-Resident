import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-bleu text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & description */}
          <div className="md:col-span-2">
            <Link to="/" className="font-serif text-2xl font-bold text-white">
              Carte Résident
            </Link>
            <p className="text-blue-200 mt-3 max-w-md leading-relaxed">
              Le programme de fidélité local qui soutient vos commerces de quartier. 
              Une initiative citoyenne pour dynamiser l'économie de votre ville.
            </p>
          </div>

          {/* Liens utiles */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-blue-200 mb-4">
              Liens utiles
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/commercants" className="text-blue-100 hover:text-white transition-colors">
                  Espace commerçants
                </Link>
              </li>
              <li>
                <Link to="/resilier" className="text-blue-100 hover:text-white transition-colors">
                  Résilier ma carte
                </Link>
              </li>
              <li>
                <a href="tel:0494000000" className="text-blue-100 hover:text-white transition-colors">
                  04 94 00 00 00
                </a>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-blue-200 mb-4">
              Informations
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/cgv" className="text-blue-100 hover:text-white transition-colors">
                  Conditions générales
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="text-blue-100 hover:text-white transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center">
          <p className="text-blue-200 text-sm">
            © {currentYear} Carte Résident. Tous droits réservés. 
            <span className="mx-2">·</span>
            Fait avec ❤️ dans le Var
          </p>
        </div>
      </div>
    </footer>
  );
}
