import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import InstallBanner from './InstallBanner';
import { trackPageView } from '../lib/analytics';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    trackPageView(pathname);
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <a href="#contenu-principal" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-bleu focus:text-white focus:rounded-lg focus:font-bold">
        Aller au contenu principal
      </a>
      <Navbar />
      <main id="contenu-principal" className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <InstallBanner />
    </div>
  );
}
