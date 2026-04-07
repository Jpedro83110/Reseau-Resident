// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, User, ChevronDown, CreditCard, Store,
  Tag, CalendarDays, FolderOpen, BarChart3, Newspaper,
  FileDown, Heart, Gift, Building2, SwitchCamera, Settings,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import NotificationsPanel from './NotificationsPanel';

// ── Configuration des liens par rôle ──────────────────────────
const LIENS_PUBLICS = [
  { name: 'Commerces', path: '/commercants', icon: Store },
  { name: 'Rejoindre', path: '/commercants/rejoindre', icon: Tag },
];

const LIENS_RESIDENT = [
  { name: 'Ma Carte', path: '/mon-espace/carte', icon: CreditCard },
  { name: 'Commerces', path: '/commercants', icon: Store },
  { name: 'Événements', path: '/mon-espace', icon: CalendarDays },
  { name: 'Projets', path: '/mon-espace', icon: FolderOpen },
];

const LIENS_COMMERCANT = [
  { name: 'Ma Fiche', path: '/mon-commerce', icon: Store },
  { name: 'Mes Offres', path: '/mon-commerce', icon: Tag },
  { name: 'Statistiques', path: '/mon-commerce', icon: BarChart3 },
];

const LIENS_ASSOCIATION = [
  { name: 'Mon Association', path: '/mon-association', icon: Building2 },
  { name: 'Mes Projets', path: '/mon-association', icon: FolderOpen },
  { name: 'Événements', path: '/mon-association', icon: CalendarDays },
];

const LIENS_MAIRIE = [
  { name: 'Tableau de bord', path: '/mairie', icon: BarChart3 },
  { name: 'Actualités', path: '/mairie', icon: Newspaper },
  { name: 'Agenda', path: '/mairie', icon: CalendarDays },
  { name: 'Projets', path: '/mairie', icon: FolderOpen },
  { name: 'Export', path: '/mairie', icon: FileDown },
];

const LIENS_ADMIN = [
  { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
];

// Dropdown pour le résident
const DROPDOWN_RESIDENT = [
  { name: 'Mes favoris', path: '/mon-espace/favoris', icon: Heart },
  { name: 'Parrainage', path: '/mon-espace/parrainage', icon: Gift },
  { name: 'Paramètres', path: '/parametres', icon: Settings },
];

// Mapping rôle → config
const ROLE_CONFIG = {
  mairie:      { label: 'Mairie',      liens: LIENS_MAIRIE,      logo: '/mairie' },
  admin:       { label: 'Admin',       liens: LIENS_ADMIN,       logo: '/dashboard' },
  commercant:  { label: 'Commerçant',  liens: LIENS_COMMERCANT,  logo: '/mon-commerce' },
  association: { label: 'Association', liens: LIENS_ASSOCIATION,  logo: '/mon-association' },
  resident:    { label: 'Résident',    liens: LIENS_RESIDENT,     logo: '/mon-espace' },
};

const ROLE_PRIORITE = ['mairie', 'admin', 'commercant', 'association', 'resident'];

function getRolePrincipal(roles) {
  for (const r of ROLE_PRIORITE) {
    if (roles.includes(r)) return r;
  }
  return null;
}

// ── Composant initiales avatar ────────────────────────────────
function Avatar({ prenom, nom, className = '' }) {
  const initiales = `${(prenom || '?')[0]}${(nom || '')[0] || ''}`.toUpperCase();
  return (
    <div className={`w-9 h-9 rounded-full bg-bleu text-white flex items-center justify-center text-sm font-bold select-none ${className}`}>
      {initiales}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────
export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [roleActif, setRoleActif] = useState(null);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, isLoading, signOut, profile, villeTheme } = useAuthContext();

  const isConnecte = !isLoading && !!user;
  const rolePrincipal = getRolePrincipal(roles);
  const roleAffiche = roleActif && roles.includes(roleActif) ? roleActif : rolePrincipal;
  const config = roleAffiche ? ROLE_CONFIG[roleAffiche] : null;
  const liensNav = isConnecte && config ? config.liens : LIENS_PUBLICS;
  const logoHref = isConnecte && config ? config.logo : '/';
  const aMultiRoles = roles.length > 1;

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fermer menus au changement de route
  useEffect(() => {
    setIsMobileOpen(false);
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Fermer dropdown au clic extérieur ou Escape
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') { setIsDropdownOpen(false); setIsMobileOpen(false); }
    }
    if (isDropdownOpen || isMobileOpen) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isDropdownOpen, isMobileOpen]);

  // Bloquer le scroll quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  async function handleSignOut() {
    setIsDropdownOpen(false);
    setIsMobileOpen(false);
    await signOut();
    navigate('/');
  }

  function handleSwitchRole(role) {
    setRoleActif(role);
    setIsDropdownOpen(false);
    setIsMobileOpen(false);
    navigate(ROLE_CONFIG[role].logo);
  }

  // ── Classes dynamiques ──
  const linkClass = `text-sm font-bold transition-colors hover:text-or ${
    isScrolled ? 'text-texte' : 'text-white'
  }`;

  const activeLinkClass = (path) =>
    location.pathname === path ? 'text-or' : '';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-bleu/80 backdrop-blur-md py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link
            to={logoHref}
            className="flex items-center gap-2.5 font-serif text-xl font-bold px-3 py-1.5 rounded text-white hover:opacity-90 transition-opacity"
            style={{ background: villeTheme?.couleur_primaire || '#1a3a5c' }}
          >
            {villeTheme?.logo_url && (
              <img loading="lazy" decoding="async" src={villeTheme.logo_url} alt="" className="w-7 h-7 object-contain rounded" />
            )}
            Réseaux-Résident
          </Link>

          {/* ── Desktop navigation ── */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Navigation principale">
            {liensNav.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`${linkClass} ${activeLinkClass(link.path)}`}
              >
                {link.name}
              </Link>
            ))}

            {isConnecte ? (
              <div className="flex items-center gap-2 ml-2">
                {/* Notifications (résidents uniquement) */}
                {roleAffiche === 'resident' && (
                  <NotificationsPanel userId={user.id} isScrolled={isScrolled} />
                )}

                {/* Avatar + dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 group"
                    aria-expanded={isDropdownOpen}
                    aria-label="Menu utilisateur"
                  >
                    <Avatar prenom={profile?.prenom} nom={profile?.nom} />
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${isScrolled ? 'text-texte' : 'text-white'} ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        role="menu"
                        aria-label="Menu utilisateur"
                        className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                      >
                        {/* Identité */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-semibold text-texte text-sm truncate">
                            {profile?.prenom} {profile?.nom}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          {config && (
                            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bleu/10 text-bleu">
                              {config.label}
                            </span>
                          )}
                        </div>

                        {/* Liens spécifiques résident */}
                        {roleAffiche === 'resident' && (
                          <div className="py-1 border-b border-gray-100">
                            {DROPDOWN_RESIDENT.map((item) => (
                              <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <item.icon size={16} className="text-gray-400" />
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Sélecteur multi-rôles */}
                        {aMultiRoles && (
                          <div className="py-1 border-b border-gray-100">
                            <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Changer d'espace
                            </p>
                            {roles.map((role) => (
                              <button
                                key={role}
                                onClick={() => handleSwitchRole(role)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                                  role === roleAffiche
                                    ? 'text-bleu bg-bleu/5 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <SwitchCamera size={14} className="text-gray-400" />
                                {ROLE_CONFIG[role]?.label ?? role}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Paramètres (tous rôles) */}
                        {roleAffiche !== 'resident' && (
                          <div className="py-1 border-b border-gray-100">
                            <Link to="/parametres" onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <Settings size={16} className="text-gray-400" /> Paramètres
                            </Link>
                          </div>
                        )}

                        {/* Déconnexion */}
                        <div className="py-1">
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut size={16} />
                            Déconnexion
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <Link
                to="/connexion"
                className="bg-or hover:bg-or-clair text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm ml-2"
              >
                Se connecter
              </Link>
            )}
          </nav>

          {/* ── Mobile toggle ── */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isScrolled ? 'text-texte hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ── Menu mobile (overlay plein écran) ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Fond sombre */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Panneau latéral droit */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-white z-50 shadow-2xl overflow-y-auto lg:hidden"
            >
              {/* Header du panneau */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="font-serif text-lg font-bold text-bleu">Menu</span>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                  aria-label="Fermer le menu"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Identité connecté */}
              {isConnecte && profile && (
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <Avatar prenom={profile.prenom} nom={profile.nom} />
                  <div className="min-w-0">
                    <p className="font-semibold text-texte text-sm truncate">
                      {profile.prenom} {profile.nom}
                    </p>
                    {config && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-bleu/10 text-bleu">
                        {config.label}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Liens de navigation */}
              <nav className="px-3 py-4 flex flex-col gap-0.5" aria-label="Menu mobile">
                {liensNav.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                        location.pathname === link.path
                          ? 'text-bleu bg-bleu/5'
                          : 'text-texte hover:bg-gray-50'
                      }`}
                    >
                      {Icon && <Icon size={20} className="text-gray-400" />}
                      {link.name}
                    </Link>
                  );
                })}
              </nav>

              {isConnecte ? (
                <>
                  {/* Liens dropdown résident en mobile */}
                  {roleAffiche === 'resident' && (
                    <div className="px-3 py-2 border-t border-gray-100">
                      <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Mon compte
                      </p>
                      {DROPDOWN_RESIDENT.map((item) => (
                        <Link
                          key={item.name}
                          to={item.path}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-texte hover:bg-gray-50 transition-colors"
                        >
                          <item.icon size={20} className="text-gray-400" />
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Sélecteur multi-rôles mobile */}
                  {aMultiRoles && (
                    <div className="px-3 py-2 border-t border-gray-100">
                      <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Changer d'espace
                      </p>
                      {roles.map((role) => (
                        <button
                          key={role}
                          onClick={() => handleSwitchRole(role)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                            role === roleAffiche
                              ? 'text-bleu bg-bleu/5'
                              : 'text-texte hover:bg-gray-50'
                          }`}
                        >
                          <SwitchCamera size={20} className="text-gray-400" />
                          {ROLE_CONFIG[role]?.label ?? role}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Déconnexion */}
                  <div className="px-3 py-4 border-t border-gray-100 mt-auto">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={20} />
                      Déconnexion
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-5 py-6 border-t border-gray-100">
                  <Link
                    to="/connexion"
                    className="block w-full py-3.5 bg-or text-white font-bold rounded-xl text-center text-base transition-colors hover:bg-or-clair"
                  >
                    Se connecter
                  </Link>
                  <p className="text-center text-sm text-gray-400 mt-3">
                    Pas encore de compte ?{' '}
                    <Link to="/inscription-compte" className="text-bleu font-medium hover:text-bleu-clair transition-colors">
                      S'inscrire
                    </Link>
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
