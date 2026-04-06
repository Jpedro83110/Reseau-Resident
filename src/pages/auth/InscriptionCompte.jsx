import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';
import { trackEvent } from '../../lib/analytics';

export default function InscriptionCompte() {
  const navigate = useNavigate();
  usePageMeta('Créer un compte');

  const [villes, setVilles] = useState([]);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', password: '', confirmPassword: '', ville_id: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('villes').select('id, nom').eq('statut', 'actif')
      .then(({ data }) => setVilles(data || []))
      .catch((err) => console.error('Erreur chargement villes:', err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (form.prenom.length < 2) { setError('Le prénom doit faire au moins 2 caractères.'); setLoading(false); return; }
    if (form.nom.length < 2) { setError('Le nom doit faire au moins 2 caractères.'); setLoading(false); return; }
    if (form.password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); setLoading(false); return; }
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); setLoading(false); return; }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { prenom: form.prenom, nom: form.nom } }
      });

      if (authError) {
        if (authError.message.includes('already registered')) setError('Un compte existe déjà avec cet email.');
        else if (authError.message.includes('valid email')) setError('Adresse email invalide.');
        else setError('Erreur : ' + authError.message);
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError('Erreur inattendue lors de la création du compte.');
        setLoading(false);
        return;
      }

      // Créer le profil résident
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: form.email,
        prenom: form.prenom,
        nom: form.nom,
        ville_id: form.ville_id || null,
      }, { onConflict: 'id', ignoreDuplicates: true });

      if (profileError) {
        console.error('Profil non créé (non bloquant):', profileError.message);
      }

      trackEvent('signup_completed', { role: 'resident' });

      if (authData.session) {
        setSuccess(true);
        setTimeout(() => navigate('/mon-espace'), 1500);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Erreur inscription:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
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
            <UserPlus size={28} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">Créer un compte</h1>
          <p className="text-gray-500">Rejoignez la communauté Réseaux-Résident</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
              Inscription réussie ! Vérifiez votre email pour confirmer votre compte.
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prenom" className="block text-sm font-bold text-gray-700 mb-2">Prénom *</label>
                  <input id="prenom" name="prenom" type="text" required value={form.prenom} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="nom" className="block text-sm font-bold text-gray-700 mb-2">Nom *</label>
                  <input id="nom" name="nom" type="text" required value={form.nom} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className={inputClass} placeholder="votre@email.fr" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">Mot de passe *</label>
                  <input id="password" name="password" type="password" required value={form.password} onChange={handleChange} className={inputClass} placeholder="6 car. minimum" />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2">Confirmer *</label>
                  <input id="confirmPassword" name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              {villes.length > 0 && (
                <div>
                  <label htmlFor="ville_id" className="block text-sm font-bold text-gray-700 mb-2">Votre ville</label>
                  <select id="ville_id" name="ville_id" value={form.ville_id} onChange={handleChange} className={inputClass}>
                    <option value="">-- Sélectionner --</option>
                    {villes.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-bleu hover:bg-bleu-clair disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-base flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Création...</> : 'Créer mon compte'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-500">
              Déjà un compte ?{' '}
              <Link to="/connexion" className="text-bleu font-bold hover:text-bleu-clair transition-colors">Se connecter</Link>
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
