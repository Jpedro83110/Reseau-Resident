import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import usePageMeta from '../../hooks/usePageMeta';

// Redirection post-login par rôle
const ROLE_REDIRECT = {
  mairie: '/mairie',
  admin: '/dashboard',
  commercant: '/mon-commerce',
  association: '/mon-association',
  resident: '/mon-espace',
};
const ROLE_PRIORITE = ['mairie', 'admin', 'commercant', 'association', 'resident'];

export default function Connexion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, signIn } = useAuthContext();
  usePageMeta('Connexion');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Si déjà connecté et rôles détectés → rediriger automatiquement
  useEffect(() => {
    if (user && roles.length > 0) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/connexion') {
        navigate(from, { replace: true });
      } else {
        const topRole = ROLE_PRIORITE.find((r) => roles.includes(r)) || 'resident';
        navigate(ROLE_REDIRECT[topRole], { replace: true });
      }
    }
  }, [user, roles, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // signIn déclenche onAuthStateChange → AuthContext détecte les rôles automatiquement
      await signIn(email, password);
      // La redirection se fait via le useEffect ci-dessus quand roles sera mis à jour
    } catch (authError) {
      const msg = authError?.message || '';
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect.');
      else if (msg.includes('Email not confirmed')) setError('Veuillez confirmer votre email (vérifiez vos spams).');
      else if (msg.includes('Too many requests')) setError('Trop de tentatives. Réessayez dans quelques minutes.');
      else setError(msg || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base bg-white';

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bleu/10 text-bleu mb-4">
            <LogIn size={28} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">Connexion</h1>
          <p className="text-gray-500">Accédez à votre espace Réseaux-Résident</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="votre@email.fr" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">Mot de passe</label>
              <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-bleu hover:bg-bleu-clair disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Connexion...</> : 'Se connecter'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/mot-de-passe-oublie" className="text-sm text-gray-400 hover:text-bleu transition-colors">
              Mot de passe oublié ?
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link to="/inscription-compte" className="text-bleu font-bold hover:text-bleu-clair transition-colors">S'inscrire</Link>
            </p>
            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-400">
              <Link to="/commercants/rejoindre" className="hover:text-bleu transition-colors">Commerçant ?</Link>
              <span>·</span>
              <Link to="/associations/rejoindre" className="hover:text-bleu transition-colors">Association ?</Link>
              <span>·</span>
              <Link to="/mairie/inscription" className="hover:text-bleu transition-colors">Mairie ?</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
