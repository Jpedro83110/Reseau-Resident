import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import InstallBanner from './InstallBanner';
import BottomNav from './layout/BottomNav';
import { useAuth } from '../hooks/useAuth';
import { trackPageView } from '../lib/analytics';

const DASHBOARD_PREFIXES = ['/mon-espace', '/mon-commerce', '/mon-association', '/mairie', '/dashboard', '/parametres', '/supprimer-compte'];

export default function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isDashboard = DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p));
  const showBottomNav = !!user && isDashboard;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    trackPageView(pathname);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <a href="#contenu-principal" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-bleu focus:text-white focus:rounded-lg focus:font-bold">
        Aller au contenu principal
      </a>
      <Navbar />
      <main id="contenu-principal" className={`flex-grow ${showBottomNav ? 'pb-20 md:pb-0' : ''}`}>
        <Outlet />
      </main>
      {!isDashboard && <Footer />}
      <BottomNav />
      <InstallBanner />
    </div>
  );
}
