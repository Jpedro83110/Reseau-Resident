import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Réseaux-Résident] Variables manquantes : VITE_SUPABASE_URL et/ou VITE_SUPABASE_ANON_KEY. ' +
    'Copiez .env.example → .env.local et renseignez vos clés Supabase (Dashboard → Settings → API).'
  );
}

// persistSession: true pour que l'admin reste connecté
// Si les clés manquent, on crée un client avec des valeurs placeholder
// pour ne pas crasher l'app au chargement — les requêtes échoueront proprement.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
);
