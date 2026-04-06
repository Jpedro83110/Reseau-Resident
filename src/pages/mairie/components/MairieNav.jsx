// src/pages/mairie/components/MairieNav.jsx
// Navigation partagée pour toutes les pages mairie :
// sidebar desktop (sticky) + bottom tabs mobile.
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Newspaper, Calendar, Download, Store, Target, BarChart3, AlertTriangle } from 'lucide-react';

const LIENS = [
  { path: '/mairie',              label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { path: '/mairie/commerces',    label: 'Commerces',       icon: Store },
  { path: '/mairie/actualites',   label: 'Actualités',      icon: Newspaper },
  { path: '/mairie/agenda',       label: 'Agenda',          icon: Calendar },
  { path: '/mairie/signalements', label: 'Signalements',    icon: AlertTriangle },
  { path: '/mairie/defis',        label: 'Défis',           icon: Target },
  { path: '/mairie/statistiques', label: 'Statistiques',    icon: BarChart3 },
  { path: '/mairie/export',       label: 'Export',          icon: Download },
];

export default function MairieNav() {
  const { pathname } = useLocation();

  return (
    <>
      {/* Desktop : sidebar */}
      <nav className="hidden lg:flex flex-col w-56 shrink-0 bg-white rounded-xl border border-gray-200 p-2 gap-0.5 h-fit sticky top-32">
        {LIENS.map(({ path, label, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-bleu text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile : bottom tabs */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40 safe-area-pb">
        {LIENS.map(({ path, label, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-bleu' : 'text-gray-400'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
