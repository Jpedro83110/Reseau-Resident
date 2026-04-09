// src/contexts/AuthContext.jsx
// Contexte d'authentification optimisé — détection des rôles avec cache session
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { clearCache } from '../lib/cache';
import { captureError } from '../lib/sentry';
import { identifyUser, resetUser, trackEvent } from '../lib/analytics';

const AuthContext = createContext(null);

// Cache des rôles en mémoire pour éviter de refaire 5 requêtes à chaque TOKEN_REFRESHED
let rolesCache = { userId: null, roles: null, profile: null, villeTheme: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(userId) {
  return rolesCache.userId === userId && rolesCache.roles && (Date.now() - rolesCache.ts < CACHE_TTL);
}

async function detecterRoles(userId) {
  // Toutes les requêtes de détection en parallèle (5 requêtes, ~1 round-trip grâce au multiplexing HTTP/2)
  const resultats = await Promise.allSettled([
    supabase.from('profiles').select('id, ville_id, prenom, nom, email, telephone, adresse, points, niveau, code_parrainage, avatar_url, created_at').eq('id', userId).maybeSingle(),
    supabase.from('commercant_profiles').select('id, commerce_id, role').eq('id', userId).maybeSingle(),
    supabase.from('association_profiles').select('id, association_id, role').eq('id', userId).maybeSingle(),
    supabase.from('mairie_profiles').select('id, ville_id, role').eq('id', userId).maybeSingle(),
    supabase.from('admins').select('id, role').eq('id', userId).maybeSingle(),
  ]);

  const [profileRes, commercantRes, assoRes, mairieRes, adminRes] = resultats.map(
    (r) => (r.status === 'fulfilled' ? r.value : { data: null })
  );

  const roles = [];
  let villeId = null;
  const profile = profileRes.data;

  if (profile) {
    roles.push('resident');
    villeId = profile.ville_id || null;
  }
  if (commercantRes.data) {
    roles.push('commercant');
    if (!villeId && commercantRes.data.commerce_id) {
      const { data: commerce } = await supabase.from('commerces').select('ville_id').eq('id', commercantRes.data.commerce_id).maybeSingle();
      if (commerce) villeId = commerce.ville_id;
    }
  }
  if (assoRes.data) roles.push('association');
  if (mairieRes.data) {
    roles.push('mairie');
    if (!villeId) villeId = mairieRes.data.ville_id;
  }
  if (adminRes.data) roles.push('admin');

  // Charger le thème ville (une seule requête)
  let villeTheme = null;
  if (villeId) {
    const { data: villeData } = await supabase.from('villes')
      .select('id, nom, slug, logo_url, couleur_primaire, couleur_secondaire')
      .eq('id', villeId).maybeSingle();
    if (villeData) {
      villeTheme = villeData;
      document.documentElement.style.setProperty('--ville-primaire', villeData.couleur_primaire || '#1a3a5c');
      document.documentElement.style.setProperty('--ville-secondaire', villeData.couleur_secondaire || '#c8963e');
    }
  }

  // Analytics
  if (roles.length > 0 && profile) {
    identifyUser(userId, { email: profile.email, prenom: profile.prenom, nom: profile.nom, roles, ville: villeId });
    trackEvent('login_success', { roles });
  }

  // Mettre en cache
  rolesCache = { userId, roles, profile, villeTheme, ts: Date.now() };

  return { roles, profile, villeTheme };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [villeTheme, setVilleTheme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const detectingRef = useRef(false); // Empêche les appels simultanés

  const applyRoles = useCallback(async (userId, forceRefresh = false) => {
    // Anti-doublon : si déjà en cours, ne pas relancer
    if (detectingRef.current) return;

    // Cache valide → appliquer sans requête
    if (!forceRefresh && isCacheValid(userId)) {
      setProfile(rolesCache.profile);
      setRoles(rolesCache.roles);
      setVilleTheme(rolesCache.villeTheme);
      return;
    }

    detectingRef.current = true;
    try {
      const result = await detecterRoles(userId);
      setProfile(result.profile);
      setRoles(result.roles);
      setVilleTheme(result.villeTheme);
    } catch (err) {
      captureError(err, 'detecterRoles');
    } finally {
      detectingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Écoute des changements d'état auth (inclut INITIAL_SESSION)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;

        if (event === 'SIGNED_OUT' || !currentUser) {
          setUser(null);
          setProfile(null);
          setRoles([]);
          setVilleTheme(null);
          rolesCache = { userId: null, roles: null, profile: null, villeTheme: null, ts: 0 };
          setIsLoading(false);
          return;
        }

        setUser(currentUser);

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          // Forcer le refresh au login, utiliser le cache pour INITIAL_SESSION
          await applyRoles(currentUser.id, event === 'SIGNED_IN');
          if (mounted) setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refresh (~1h) → utiliser le cache, pas de requête
          await applyRoles(currentUser.id, false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyRoles]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    clearCache();
    resetUser();
    setUser(null);
    setProfile(null);
    setRoles([]);
    setVilleTheme(null);
    rolesCache = { userId: null, roles: null, profile: null, villeTheme: null, ts: 0 };
    document.documentElement.style.removeProperty('--ville-primaire');
    document.documentElement.style.removeProperty('--ville-secondaire');
  }

  function hasRole(role) {
    return roles.includes(role);
  }

  // Forcer le rafraîchissement des rôles (après validation commerce par ex.)
  async function refreshRoles() {
    if (user) await applyRoles(user.id, true);
  }

  const value = { user, profile, roles, villeTheme, isLoading, signIn, signUp, signOut, hasRole, refreshRoles };

  // Écran de chargement — UNIQUEMENT au tout premier chargement
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-creme">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Chargement...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext doit être utilisé à l\'intérieur d\'un <AuthProvider>');
  }
  return ctx;
}
