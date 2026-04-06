// src/components/ProtectedRoute.jsx
// Garde les routes protégées : vérifie auth + rôle(s) requis.
// Props :
//   - role  (string)   : rôle unique requis
//   - roles (string[]) : rôles alternatifs (au moins un doit matcher)
//   - children         : contenu à rendre si autorisé
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, role, roles: rolesList }) {
  const { user, roles, isLoading, hasRole } = useAuthContext();
  const location = useLocation();

  // Attente du chargement de la session initiale
  if (isLoading) return null;

  // Non connecté → page de connexion avec retour prévu
  if (!user) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  // Vérification du rôle requis
  const rolesRequis = rolesList ?? (role ? [role] : []);

  if (rolesRequis.length > 0 && !rolesRequis.some((r) => hasRole(r))) {
    // L'utilisateur est authentifié mais n'a aucun rôle du tout → compléter profil
    if (roles.length === 0) {
      return <Navigate to="/completer-profil" replace />;
    }

    // L'utilisateur a des rôles mais pas le bon → rediriger vers son espace principal
    // Priorité : mairie > admin > commercant > association > resident
    const ROLE_REDIRECT = {
      mairie: '/mairie',
      admin: '/dashboard',
      commercant: '/mon-commerce',
      association: '/mon-association',
      resident: '/mon-espace',
    };
    const PRIORITE = ['mairie', 'admin', 'commercant', 'association', 'resident'];
    const destination = PRIORITE.find((r) => roles.includes(r));

    // Éviter la boucle infinie : si la destination est la page actuelle, ne pas rediriger
    const redirectTo = destination ? ROLE_REDIRECT[destination] : '/';
    if (redirectTo === location.pathname) {
      return <Navigate to="/" replace />;
    }

    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
