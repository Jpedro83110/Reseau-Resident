// src/pages/association/InscriptionAssociation.jsx
// Page d'inscription pour une association — avec auto-complétion RNA optionnelle
import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Mail, Phone, Globe, MapPin, ArrowLeft, CheckCircle2,
  Search, Loader2, Info, Upload, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { rechercherParRNA } from '../../lib/associations-api';
import AutocompleteAdresse from '../../components/AutocompleteAdresse';
import AutocompleteVille from '../../components/AutocompleteVille';
import usePageMeta from '../../hooks/usePageMeta';

const CATEGORIES = [
  'Sport', 'Culture', 'Éducation', 'Environnement', 'Social & Solidarité',
  'Santé', 'Loisirs & Jeunesse', 'Vie locale', 'Autre',
];

export default function InscriptionAssociation() {
  const navigate = useNavigate();
  usePageMeta('Inscrire une association');

  const [step, setStep] = useState(1); // 1 = formulaire, 2 = succès
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // RNA auto-complétion
  const [rnaLoading, setRnaLoading] = useState(false);
  const [rnaInfo, setRnaInfo] = useState(null); // null | 'found' | 'not_found' | 'error'
  const [rnaMessage, setRnaMessage] = useState('');

  // Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [form, setForm] = useState({
    rna: '',
    nom: '',
    description: '',
    categorie: '',
    adresse: '',
    nomVille: '',
    departement: '',
    email: '',
    telephone: '',
    siteWeb: '',
    // Compte auth
    authEmail: '',
    password: '',
    prenom: '',
    nomResponsable: '',
    role: 'president',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  // Recherche RNA quand l'utilisateur entre un numéro valide (W + 9 chiffres)
  const handleRnaChange = useCallback(async (e) => {
    const value = e.target.value.toUpperCase();
    setForm((p) => ({ ...p, rna: value }));

    const clean = value.trim();
    if (!/^W\d{9}$/.test(clean)) {
      setRnaInfo(null);
      setRnaMessage('');
      return;
    }

    try {
      setRnaLoading(true);
      setRnaInfo(null);
      setRnaMessage('');

      const result = await rechercherParRNA(clean);

      if (!result) {
        setRnaInfo('not_found');
        setRnaMessage('Numéro RNA non trouvé dans le registre national. Vérifiez le numéro.');
        return;
      }

      // Pré-remplir les champs
      setForm((p) => ({
        ...p,
        nom: result.nom || p.nom,
        description: result.objet || p.description,
        adresse: result.adresse || p.adresse,
        email: result.email || p.email,
        telephone: result.telephone || p.telephone,
        siteWeb: result.siteWeb || p.siteWeb,
      }));

      setRnaInfo('found');
      setRnaMessage(`Informations récupérées : ${result.nom}`);
    } catch (err) {
      setRnaInfo('error');
      setRnaMessage(err.message || 'Erreur lors de la recherche RNA.');
    } finally {
      setRnaLoading(false);
    }
  }, []);

  // Gestion logo
  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Le logo ne doit pas dépasser 2 Mo.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function removeLogo() {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Validations
    if (!form.nom.trim()) { setError('Le nom de l\'association est requis.'); return; }
    if (!form.categorie) { setError('Veuillez choisir une catégorie.'); return; }
    if (!form.authEmail.trim()) { setError('L\'email du compte est requis.'); return; }
    if (!form.password || form.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (!form.prenom.trim() || !form.nomResponsable.trim()) { setError('Le prénom et le nom du responsable sont requis.'); return; }

    try {
      setLoading(true);

      // 1. Créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.authEmail.trim(),
        password: form.password,
        options: {
          data: {
            prenom: form.prenom.trim(),
            nom: form.nomResponsable.trim(),
            type: 'association',
          },
        },
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Erreur lors de la création du compte.');

      // 2. Upload logo si présent
      let logoUrl = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logos/${userId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('associations-logos')
          .upload(path, logoFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('associations-logos')
            .getPublicUrl(path);
          logoUrl = urlData?.publicUrl ?? null;
        }
      }

      // 3. Chercher la ville correspondante dans Supabase
      let villeId = null;
      if (form.nomVille) {
        const { data: villeData } = await supabase
          .from('villes')
          .select('id')
          .ilike('nom', form.nomVille.trim())
          .maybeSingle();
        villeId = villeData?.id ?? null;
      }

      // 4. Créer l'association
      const { data: assoData, error: assoError } = await supabase
        .from('associations')
        .insert({
          ville_id: villeId,
          nom: form.nom.trim(),
          description: form.description.trim() || null,
          categorie: form.categorie,
          adresse: form.adresse.trim() || null,
          email: form.email.trim() || null,
          telephone: form.telephone.trim() || null,
          site_web: form.siteWeb.trim() || null,
          logo_url: logoUrl,
          numero_rna: form.rna.trim() || null,
          actif: true,
        })
        .select('id')
        .single();
      if (assoError) throw assoError;

      // 5. Créer le profil association
      const { error: profileError } = await supabase
        .from('association_profiles')
        .insert({
          id: userId,
          association_id: assoData.id,
          role: form.role,
        });
      if (profileError) throw profileError;

      setStep(2);
    } catch (err) {
      console.error('Erreur inscription association:', err);
      if (err.message?.includes('already registered')) {
        setError('Un compte existe déjà avec cette adresse email.');
      } else {
        setError(err.message || 'Erreur lors de l\'inscription. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Écran de succès ──
  if (step === 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen flex items-center justify-center px-4 py-16"
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-vert" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-texte mb-2">Inscription réussie !</h2>
          <p className="text-gray-600 mb-2">
            Votre association <span className="font-semibold">{form.nom}</span> a été créée.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Vérifiez votre boîte mail pour confirmer votre adresse email,
            puis connectez-vous pour accéder à votre espace association.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/connexion"
              className="block w-full py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-center"
            >
              Se connecter
            </Link>
            <Link
              to="/"
              className="block w-full py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-center"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Formulaire ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen py-10 px-4"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-bleu transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Retour à l'accueil
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-bleu/10 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-bleu" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-texte">Inscrire mon association</h1>
              <p className="text-sm text-gray-500">Rejoignez Réseaux-Résident gratuitement</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Section RNA (optionnel) ── */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="font-semibold text-texte mb-1 flex items-center gap-2">
              <Search size={18} className="text-bleu" />
              Recherche par numéro RNA
              <span className="text-xs text-gray-400 font-normal">(optionnel)</span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Renseignez votre numéro RNA pour pré-remplir automatiquement les informations.
            </p>

            <div className="relative">
              <input
                type="text"
                name="rna"
                value={form.rna}
                onChange={handleRnaChange}
                placeholder="W123456789"
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all uppercase font-mono"
              />
              {rnaLoading && (
                <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-bleu animate-spin" />
              )}
            </div>

            {rnaInfo && (
              <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
                rnaInfo === 'found' ? 'bg-green-50 text-vert' :
                rnaInfo === 'not_found' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-600'
              }`}>
                {rnaInfo === 'found' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> :
                  <Info size={16} className="shrink-0 mt-0.5" />}
                <span>{rnaMessage}</span>
              </div>
            )}
          </section>

          {/* ── Informations association ── */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-texte flex items-center gap-2">
              <Users size={18} className="text-bleu" />
              Informations de l'association
            </h2>

            {/* Nom */}
            <div>
              <label htmlFor="nom" className="block text-sm font-bold text-gray-700 mb-2">Nom de l'association *</label>
              <input
                id="nom"
                name="nom"
                type="text"
                value={form.nom}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                placeholder="Ex : Club Sportif Sanary"
              />
            </div>

            {/* Catégorie */}
            <div>
              <label htmlFor="categorie" className="block text-sm font-bold text-gray-700 mb-2">Catégorie *</label>
              <select
                id="categorie"
                name="categorie"
                value={form.categorie}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all bg-white"
              >
                <option value="">Choisir une catégorie</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-2">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all resize-none"
                placeholder="Décrivez brièvement votre association, ses activités..."
              />
            </div>

            {/* Adresse */}
            <AutocompleteAdresse
              id="adresse"
              label="Adresse du siège"
              value={form.adresse}
              onChange={(val) => setForm((p) => ({ ...p, adresse: val }))}
              onSelect={(s) => setForm((p) => ({ ...p, adresse: s.label }))}
              placeholder="Adresse de l'association"
            />

            {/* Ville */}
            <AutocompleteVille
              id="nomVille"
              label="Ville"
              value={form.nomVille}
              onChange={(val) => setForm((p) => ({ ...p, nomVille: val }))}
              onSelect={(s) => setForm((p) => ({
                ...p,
                nomVille: s.nom,
                departement: s.departement || '',
              }))}
              placeholder="Ville de l'association"
            />

            {/* Logo */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Logo</label>
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    <X size={14} />
                    Supprimer
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-bleu cursor-pointer transition-colors">
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Choisir un logo (max 2 Mo)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </section>

          {/* ── Coordonnées ── */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-texte flex items-center gap-2">
              <Mail size={18} className="text-bleu" />
              Coordonnées
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email de l'association</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                    placeholder="contact@association.fr"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="telephone" className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    value={form.telephone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                    placeholder="04 94 ..."
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="siteWeb" className="block text-sm font-bold text-gray-700 mb-2">Site web</label>
              <div className="relative">
                <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="siteWeb"
                  name="siteWeb"
                  type="url"
                  value={form.siteWeb}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                  placeholder="https://www.association.fr"
                />
              </div>
            </div>
          </section>

          {/* ── Compte responsable ── */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-texte flex items-center gap-2">
              <Users size={18} className="text-bleu" />
              Compte du responsable
            </h2>
            <p className="text-sm text-gray-500 -mt-2">
              Créez votre compte personnel pour gérer l'association.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prenom" className="block text-sm font-bold text-gray-700 mb-2">Prénom *</label>
                <input
                  id="prenom"
                  name="prenom"
                  type="text"
                  value={form.prenom}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="nomResponsable" className="block text-sm font-bold text-gray-700 mb-2">Nom *</label>
                <input
                  id="nomResponsable"
                  name="nomResponsable"
                  type="text"
                  value={form.nomResponsable}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Rôle dans l'association */}
            <div>
              <label htmlFor="role" className="block text-sm font-bold text-gray-700 mb-2">Votre rôle</label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all bg-white"
              >
                <option value="president">Président(e)</option>
                <option value="admin">Administrateur</option>
                <option value="membre">Membre du bureau</option>
              </select>
            </div>

            <div>
              <label htmlFor="authEmail" className="block text-sm font-bold text-gray-700 mb-2">Email de connexion *</label>
              <input
                id="authEmail"
                name="authEmail"
                type="email"
                value={form.authEmail}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                placeholder="votre@email.fr"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">Mot de passe *</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all"
                placeholder="Minimum 6 caractères"
              />
            </div>
          </section>

          {/* ── Erreur ── */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Inscription en cours...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Inscrire mon association
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Déjà inscrit ?{' '}
            <Link to="/connexion" className="text-bleu hover:underline">Se connecter</Link>
          </p>
        </form>
      </div>
    </motion.div>
  );
}
