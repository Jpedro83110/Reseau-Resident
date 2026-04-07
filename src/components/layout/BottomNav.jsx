import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Tag, Heart, CreditCard, User, Store, BarChart3, MessageSquare, Building2, Calendar, Megaphone, FolderKanban, Settings, LayoutDashboard, Users, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Routes de dashboard — le BottomNav ne s'affiche que sur ces préfixes
const DASHBOARD_PREFIXES = ['/mon-espace', '/mon-commerce', '/mon-association', '/mairie', '/dashboard', '/parametres', '/supprimer-compte'];

const ITEMS = {
  resident: [
    { path: '/mon-espace', icon: Home, label: 'Accueil' },
    { path: '/mon-espace/favoris', icon: Heart, label: 'Favoris' },
    { path: '/parametres', icon: User, label: 'Profil' },
  ],
  commercant: [
    { path: '/mon-commerce', icon: Store, label: 'Commerce' },
    { path: '/parametres', icon: User, label: 'Profil' },
  ],
  association: [
    { path: '/mon-association', icon: FolderKanban, label: 'Projets' },
    { path: '/parametres', icon: User, label: 'Profil' },
  ],
  mairie: [
    { path: '/mairie', icon: Building2, label: 'Mairie' },
    { path: '/mairie/actualites', icon: Megaphone, label: 'Actus' },
    { path: '/mairie/agenda', icon: Calendar, label: 'Agenda' },
    { path: '/mairie/statistiques', icon: BarChart3, label: 'Stats' },
    { path: '/parametres', icon: User, label: 'Profil' },
  ],
  admin: [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Admin' },
    { path: '/parametres', icon: User, label: 'Profil' },
  ],
};

export default function BottomNav() {
  const { user, roles } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Ne pas afficher si pas connecté ou pas sur un dashboard
  const isDashboard = DASHBOARD_PREFIXES.some((p) => location.pathname.startsWith(p));
  if (!user || !isDashboard) return null;

  // Déterminer les items selon le rôle principal
  const role = roles.includes('admin') ? 'admin'
    : roles.includes('mairie') ? 'mairie'
    : roles.includes('commercant') ? 'commercant'
    : roles.includes('association') ? 'association'
    : 'resident';

  const items = ITEMS[role] || ITEMS.resident;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-white border-t border-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const isActive = location.pathname === item.path
            || (item.path !== '/' && item.path !== '/parametres' && location.pathname.startsWith(item.path + '/'));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] flex-1 py-2 transition-colors ${
                isActive ? 'text-bleu' : 'text-gray-400'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
