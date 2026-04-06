// src/hooks/useAuth.js
// Expose l'état d'auth et les méthodes partout dans l'app.
// Utilisation : const { user, profile, roles, isLoading, signIn, signOut, hasRole } = useAuth();

export { useAuthContext as useAuth } from '../contexts/AuthContext';
