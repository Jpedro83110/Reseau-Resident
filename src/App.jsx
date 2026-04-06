import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Home chargée directement (premier paint rapide)
import Home from './pages/Home';
// Pages publiques (lazy)
const Ville = lazy(() => import('./pages/villes/Ville'));
const EvenementsVille = lazy(() => import('./pages/villes/EvenementsVille'));
const EvenementDetail = lazy(() => import('./pages/villes/EvenementDetail'));
const Inscription = lazy(() => import('./pages/inscription/Inscription'));
const Commercants = lazy(() => import('./pages/commercants/Commercants'));
const Rejoindre = lazy(() => import('./pages/commercants/Rejoindre'));
const Scan = lazy(() => import('./pages/scan/Scan'));
const Resilier = lazy(() => import('./pages/Resilier'));
const RetirerCommerce = lazy(() => import('./pages/RetirerCommerce'));
const CGV = lazy(() => import('./pages/CGV'));
const Confidentialite = lazy(() => import('./pages/Confidentialite'));
const ActualiteDetail = lazy(() => import('./pages/ActualiteDetail'));
const ProjetPublic = lazy(() => import('./pages/projets/ProjetPublic'));
const InscriptionAssociation = lazy(() => import('./pages/association/InscriptionAssociation'));
const InscriptionMairie = lazy(() => import('./pages/mairie/InscriptionMairie'));

// Pages auth
const Connexion = lazy(() => import('./pages/auth/Connexion'));
const InscriptionCompte = lazy(() => import('./pages/auth/InscriptionCompte'));
const MotDePasseOublie = lazy(() => import('./pages/auth/MotDePasseOublie'));
const CompleterProfil = lazy(() => import('./pages/auth/CompleterProfil'));
const SupprimerCompte = lazy(() => import('./pages/auth/SupprimerCompte'));
const Parametres = lazy(() => import('./pages/auth/Parametres'));

// Dashboards (nouveaux)
const DashboardResident = lazy(() => import('./pages/resident/DashboardResident'));
const MesFavoris = lazy(() => import('./pages/resident/MesFavoris'));
const DashboardCommercant = lazy(() => import('./pages/commercant/DashboardCommercant'));
const DashboardAssociation = lazy(() => import('./pages/association/DashboardAssociation'));
const CreerProjet = lazy(() => import('./pages/association/CreerProjet'));
const DetailProjet = lazy(() => import('./pages/association/DetailProjet'));
const DashboardMairie = lazy(() => import('./pages/mairie/DashboardMairie'));
const BackOfficeActualites = lazy(() => import('./pages/mairie/BackOfficeActualites'));
const BackOfficeAgenda = lazy(() => import('./pages/mairie/BackOfficeAgenda'));
const ExportBilans = lazy(() => import('./pages/mairie/ExportBilans'));
const GestionCommerces = lazy(() => import('./pages/mairie/GestionCommerces'));
const GestionDefis = lazy(() => import('./pages/mairie/GestionDefis'));
const GestionSignalements = lazy(() => import('./pages/mairie/GestionSignalements'));
const Statistiques = lazy(() => import('./pages/mairie/Statistiques'));

// Dashboard admin existant
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-creme">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Chargement...</p>
      </div>
    </div>
  );
}

function W({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Pages publiques */}
        <Route index element={<Home />} />
        <Route path="villes/:slug" element={<W><Ville /></W>} />
        <Route path="villes/:slug/evenements" element={<W><EvenementsVille /></W>} />
        <Route path="villes/:slug/evenements/:eventId" element={<W><EvenementDetail /></W>} />
        <Route path="inscription" element={<W><Inscription /></W>} />
        <Route path="commercants" element={<W><Commercants /></W>} />
        <Route path="commercants/rejoindre" element={<W><Rejoindre /></W>} />
        <Route path="scan" element={<W><Scan /></W>} />
        <Route path="resilier" element={<W><Resilier /></W>} />
        <Route path="retirer-commerce" element={<W><RetirerCommerce /></W>} />
        <Route path="cgv" element={<W><CGV /></W>} />
        <Route path="confidentialite" element={<W><Confidentialite /></W>} />
        <Route path="actualites/:id" element={<W><ActualiteDetail /></W>} />
        <Route path="projets/:id" element={<W><ProjetPublic /></W>} />
        <Route path="associations/rejoindre" element={<W><InscriptionAssociation /></W>} />
        <Route path="mairie/inscription" element={<W><InscriptionMairie /></W>} />

        {/* Auth */}
        <Route path="connexion" element={<W><Connexion /></W>} />
        <Route path="inscription-compte" element={<W><InscriptionCompte /></W>} />
        <Route path="mot-de-passe-oublie" element={<W><MotDePasseOublie /></W>} />
        <Route
          path="completer-profil"
          element={
            <ProtectedRoute>
              <W><CompleterProfil /></W>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Résident (protégé) */}
        <Route
          path="mon-espace"
          element={
            <ProtectedRoute role="resident">
              <W><DashboardResident /></W>
            </ProtectedRoute>
          }
        />

        <Route
          path="mon-espace/favoris"
          element={
            <ProtectedRoute role="resident">
              <W><MesFavoris /></W>
            </ProtectedRoute>
          }
        />

        <Route
          path="parametres"
          element={
            <ProtectedRoute>
              <W><Parametres /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="supprimer-compte"
          element={
            <ProtectedRoute>
              <W><SupprimerCompte /></W>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Commerçant (protégé) */}
        <Route
          path="mon-commerce"
          element={
            <ProtectedRoute role="commercant">
              <W><DashboardCommercant /></W>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Association (protégé) */}
        <Route
          path="mon-association"
          element={
            <ProtectedRoute role="association">
              <W><DashboardAssociation /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mon-association/projets/nouveau"
          element={
            <ProtectedRoute role="association">
              <W><CreerProjet /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mon-association/projets/:id"
          element={
            <ProtectedRoute role="association">
              <W><DetailProjet /></W>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Mairie (protégé) */}
        <Route
          path="mairie"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><DashboardMairie /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mairie/actualites"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><BackOfficeActualites /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mairie/agenda"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><BackOfficeAgenda /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mairie/export"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><ExportBilans /></W>
            </ProtectedRoute>
          }
        />

        <Route
          path="mairie/commerces"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><GestionCommerces /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mairie/signalements"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><GestionSignalements /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mairie/defis"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><GestionDefis /></W>
            </ProtectedRoute>
          }
        />
        <Route
          path="mairie/statistiques"
          element={
            <ProtectedRoute roles={['mairie', 'admin']}>
              <W><Statistiques /></W>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Admin existant (protégé) */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute role="admin">
              <W><Dashboard /></W>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center text-center px-4">
              <div>
                <h1 className="font-serif text-6xl font-bold text-bleu mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Cette page n'existe pas.</p>
                <a
                  href="/"
                  className="px-6 py-3 bg-or text-white font-bold rounded-xl hover:bg-or-clair transition-colors"
                >
                  Retour à l'accueil
                </a>
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
