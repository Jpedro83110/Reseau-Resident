import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_LINKS = [
  { name: 'Comment ça marche', anchor: 'comment-ca-marche', path: '/' },
  { name: 'Tarifs', anchor: 'tarifs', path: '/' },
  { name: 'Commerçants', path: '/commercants' },
  { name: 'Offrir une carte', anchor: 'cartes-cadeaux', path: '/' },
  { name: 'Mon espace', path: '/mon-espace' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Ferme le menu mobile au changement de route
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  function handleAnchorClick(e, link) {
    if (!link.anchor) return;

    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileOpen(false);
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link
            to="/"
            className="font-serif text-xl font-bold px-3 py-1.5 rounded bg-bleu text-white hover:opacity-90 transition-opacity"
          >
            Carte Résident
          </Link>

          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Navigation principale">
            {NAV_LINKS.map((link) =>
              link.anchor ? (
                <a
                  key={link.name}
                  href={`/#${link.anchor}`}
                  onClick={(e) => handleAnchorClick(e, link)}
                  className={`text-sm font-medium transition-colors hover:text-or ${
                    isScrolled ? 'text-texte' : 'text-white'
                  }`}
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-or ${
                    isScrolled ? 'text-texte' : 'text-white'
                  }`}
                >
                  {link.name}
                </Link>
              )
            )}
            <Link
              to="/#recherche"
              onClick={(e) => handleAnchorClick(e, { anchor: 'recherche', path: '/' })}
              className="bg-or hover:bg-or-clair text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
            >
              Ma ville
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-bleu rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden shadow-lg"
          >
            <nav className="px-4 py-6 flex flex-col gap-1" aria-label="Menu mobile">
              {NAV_LINKS.map((link) =>
                link.anchor ? (
                  <a
                    key={link.name}
                    href={`/#${link.anchor}`}
                    onClick={(e) => handleAnchorClick(e, link)}
                    className="px-4 py-3 text-lg font-medium text-texte rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="px-4 py-3 text-lg font-medium text-texte rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {link.name}
                  </Link>
                )
              )}
              <Link
                to="/"
                onClick={(e) => handleAnchorClick(e, { anchor: 'recherche', path: '/' })}
                className="mt-4 px-4 py-4 bg-or text-white font-bold rounded-xl text-center text-lg transition-colors hover:bg-or-clair"
              >
                Ma ville
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
