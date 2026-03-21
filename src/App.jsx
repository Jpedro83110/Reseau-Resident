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
const MonEspace = lazy(() => import('./pages/MonEspace'));
const MonCommerce = lazy(() => import('./pages/MonCommerce'));
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

function W({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<W><Home /></W>} />
        <Route path="villes/:slug" element={<W><Ville /></W>} />
        <Route path="inscription" element={<W><Inscription /></W>} />
        <Route path="commercants" element={<W><Commercants /></W>} />
        <Route path="commercants/rejoindre" element={<W><Rejoindre /></W>} />
        <Route path="dashboard" element={<W><Dashboard /></W>} />
        <Route path="scan" element={<W><Scan /></W>} />
        <Route path="resilier" element={<W><Resilier /></W>} />
        <Route path="retirer-commerce" element={<W><RetirerCommerce /></W>} />
        <Route path="mon-espace" element={<W><MonEspace /></W>} />
        <Route path="mon-commerce" element={<W><MonCommerce /></W>} />
        <Route path="cgv" element={<W><CGV /></W>} />
        <Route path="confidentialite" element={<W><Confidentialite /></W>} />
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center text-center px-4">
            <div>
              <h1 className="font-serif text-6xl font-bold text-bleu mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-8">Cette page n'existe pas.</p>
              <a href="/" className="px-6 py-3 bg-or text-white font-bold rounded-xl hover:bg-or-clair transition-colors">Retour</a>
            </div>
          </div>
        } />
      </Route>
    </Routes>
  );
}
