// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { clearCache } from '../lib/cache';
import { captureError } from '../lib/sentry';
import { identifyUser, resetUser, trackEvent } from '../lib/analytics';

const AuthContext = createContext(null);

async function detecterRoles(userId, setProfile, setRoles, setVilleTheme) {
  const resultats = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
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

  if (profileRes.data) {
    setProfile(profileRes.data);
    roles.push('resident');
    villeId = profileRes.data.ville_id || null;
  }
  if (commercantRes.data) {
    roles.push('commercant');
    // Recuperer ville_id du commerce
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

  // Charger le theme de la ville si on a un ville_id
  if (villeId && setVilleTheme) {
    const { data: villeData } = await supabase.from('villes')
      .select('id, nom, logo_url, couleur_primaire, couleur_secondaire')
      .eq('id', villeId).maybeSingle();
    if (villeData) {
      setVilleTheme(villeData);
      // Appliquer les couleurs au document
      document.documentElement.style.setProperty('--ville-primaire', villeData.couleur_primaire || '#1a3a5c');
      document.documentElement.style.setProperty('--ville-secondaire', villeData.couleur_secondaire || '#c8963e');
    }
  }

  setRoles(roles);

  // Analytics : identifier l'utilisateur
  if (roles.length > 0 && profileRes.data) {
    identifyUser(userId, {
      email: profileRes.data.email,
      prenom: profileRes.data.prenom,
      nom: profileRes.data.nom,
      roles,
      ville: villeId,
    });
    trackEvent('login_success', { roles });
  }

  return roles;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [villeTheme, setVilleTheme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérification de la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        detecterRoles(currentUser.id, setProfile, setRoles, setVilleTheme).finally(() =>
          setIsLoading(false)
        );
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      // Si Supabase est injoignable (env manquant, réseau…), on débloque l'app
      captureError(err, 'AuthContext.init');
      setIsLoading(false);
    });

    // Écoute des changements d'état auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUser = session?.user ?? null;

        if (event === 'SIGNED_OUT' || !currentUser) {
          // Déconnexion (y compris depuis un autre onglet)
          setUser(null);
          setProfile(null);
          setRoles([]);
          return;
        }

        if (event === 'SIGNED_IN') {
          setUser(currentUser);
          setIsLoading(true);
          detecterRoles(currentUser.id, setProfile, setRoles, setVilleTheme).finally(() => setIsLoading(false));
        } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setUser(currentUser);
          detecterRoles(currentUser.id, setProfile, setRoles, setVilleTheme);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
    document.documentElement.style.removeProperty('--ville-primaire');
    document.documentElement.style.removeProperty('--ville-secondaire');
  }

  function hasRole(role) {
    return roles.includes(role);
  }

  const value = { user, profile, roles, villeTheme, isLoading, signIn, signUp, signOut, hasRole };

  // Écran de chargement plein écran tant que l'auth n'est pas résolue
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-creme">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">Connexion en cours...</p>
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
