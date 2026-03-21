import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

const Home = lazy(() => import('./pages/Home'));
const Ville = lazy(() => import('./pages/villes/Ville'));
const Inscription = lazy(() => import('./pages/inscription/Inscription'));
const Commercants = lazy(() => import('./pages/commercants/Commercants'));
const Rejoindre = lazy(() => import('./pages/commercants/Rejoindre'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const Scan = lazy(() => import('./pages/scan/Scan'));
const Resilier = lazy(() => import('./pages/Resilier'));
const RetirerCommerce = lazy(() => import('./pages/RetirerCommerce'));
const CGV = lazy(() => import('./pages/CGV'));
const Confidentialite = lazy(() => import('./pages/Confidentialite'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-creme">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-or border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Chargement...</p>
      </div>
    </div>
  );
}

function Wrap({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Wrap><Home /></Wrap>} />
        <Route path="villes/:slug" element={<Wrap><Ville /></Wrap>} />
        <Route path="inscription" element={<Wrap><Inscription /></Wrap>} />
        <Route path="commercants" element={<Wrap><Commercants /></Wrap>} />
        <Route path="commercants/rejoindre" element={<Wrap><Rejoindre /></Wrap>} />
        <Route path="dashboard" element={<Wrap><Dashboard /></Wrap>} />
        <Route path="scan" element={<Wrap><Scan /></Wrap>} />
        <Route path="resilier" element={<Wrap><Resilier /></Wrap>} />
        <Route path="retirer-commerce" element={<Wrap><RetirerCommerce /></Wrap>} />
        <Route path="cgv" element={<Wrap><CGV /></Wrap>} />
        <Route path="confidentialite" element={<Wrap><Confidentialite /></Wrap>} />
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center text-center px-4">
            <div>
              <h1 className="font-serif text-6xl font-bold text-bleu mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-8">Cette page n'existe pas.</p>
              <a href="/" className="px-6 py-3 bg-or text-white font-bold rounded-xl hover:bg-or-clair transition-colors">Retour à l'accueil</a>
            </div>
          </div>
        } />
      </Route>
    </Routes>
  );
}
