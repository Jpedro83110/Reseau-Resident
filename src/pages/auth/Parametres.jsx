import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, User, Mail, Phone, MapPin, Save, Loader2, Trash2, AlertTriangle, LogOut, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import usePageMeta from '../../hooks/usePageMeta';

export default function Parametres() {
  usePageMeta('Paramètres du compte');
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthContext();

  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', adresse: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        telephone: profile.telephone || '',
        adresse: profile.adresse || '',
      });
    }
  }, [profile]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error: updateErr } = await supabase.from('profiles').update({
      prenom: form.prenom,
      nom: form.nom,
      telephone: form.telephone || null,
      adresse: form.adresse || null,
    }).eq('id', user.id);

    if (updateErr) {
      setError('Erreur : ' + updateErr.message);
    } else {
      setSuccess('Informations mises à jour.');
    }
    setLoading(false);
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPasswordLoading(true);
    setError(null);
    setSuccess(null);

    const { error: pwErr } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    if (pwErr) {
      setError('Erreur : ' + pwErr.message);
    } else {
      setSuccess('Mot de passe modifié.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
    setPasswordLoading(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'SUPPRIMER' || !user) return;
    setDeleteLoading(true);

    try {
      const userId = user.id;
      const email = user.email;

      await supabase.from('favoris').delete().eq('profile_id', userId);
      await supabase.from('notifications').delete().eq('destinataire_id', userId);
      await supabase.from('soutiens').delete().eq('soutien_id', userId);
      await supabase.from('utilisations_offres').delete().eq('profile_id', userId);
      await supabase.from('commercant_profiles').delete().eq('id', userId);
      await supabase.from('association_profiles').delete().eq('id', userId);
      await supabase.from('mairie_profiles').delete().eq('id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      if (email) await supabase.from('cartes').delete().eq('email', email);

      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Erreur suppression:', err);
      setError('Erreur lors de la suppression. Contactez le support.');
    }
    setDeleteLoading(false);
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base bg-white';

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-bleu/10 text-bleu flex items-center justify-center">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-texte">Paramètres</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">{success}</div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Informations personnelles */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-bold text-texte mb-5 flex items-center gap-2">
            <User size={18} className="text-bleu" /> Informations personnelles
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Prénom</label>
                <input name="prenom" value={form.prenom} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nom</label>
                <input name="nom" value={form.nom} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2"><Phone size={14} className="inline mr-1" />Téléphone</label>
              <input name="telephone" value={form.telephone} onChange={handleChange} className={inputClass} placeholder="06 00 00 00 00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2"><MapPin size={14} className="inline mr-1" />Adresse</label>
              <input name="adresse" value={form.adresse} onChange={handleChange} className={inputClass} placeholder="12 rue de la République" />
            </div>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Enregistrer
            </button>
          </form>
        </div>

        {/* Mot de passe */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="font-serif text-lg font-bold text-texte mb-5 flex items-center gap-2">
            <Lock size={18} className="text-bleu" /> Modifier le mot de passe
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nouveau mot de passe</label>
                <input type="password" value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className={inputClass} placeholder="6 car. minimum" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirmer</label>
                <input type="password" value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={inputClass} />
              </div>
            </div>
            <button type="submit" disabled={passwordLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors disabled:opacity-50">
              {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Modifier le mot de passe
            </button>
          </form>
        </div>

        {/* Zone danger */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <h2 className="font-serif text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} /> Zone dangereuse
          </h2>

          {!showDelete ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => { signOut(); navigate('/'); }}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm">
                <LogOut size={16} /> Se déconnecter
              </button>
              <button onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors text-sm">
                <Trash2 size={16} /> Supprimer mon compte
              </button>
            </div>
          ) : (
            <div className="bg-red-50 rounded-xl p-5 border border-red-200">
              <p className="text-red-700 text-sm mb-4">
                Cette action est <strong>irréversible</strong>. Toutes vos données, cartes, favoris et badges seront définitivement supprimés.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-bold text-red-700 mb-2">
                  Tapez <span className="font-mono">SUPPRIMER</span> pour confirmer
                </label>
                <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none text-base bg-white" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'SUPPRIMER' || deleteLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-40 text-sm">
                  {deleteLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Supprimer définitivement
                </button>
                <button onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                  className="px-5 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors text-sm">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
