// src/pages/commercants/Rejoindre.jsx
// Inscription commerçant en 4 étapes avec wizard animé
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '../../lib/analytics';
import { Store, MapPin, Mail, Tag, ArrowLeft, ArrowRight, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { creerDemandeCommercant, getVilles } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import AutocompleteVille from '../../components/AutocompleteVille';
import usePageMeta from '../../hooks/usePageMeta';

const CATEGORIES = [
  { value: 'Restauration / Bar / Café', label: '🍽️ Restaurant / Bar' },
  { value: 'Boulangerie / Pâtisserie', label: '🥖 Boulangerie' },
  { value: 'Alimentation / Épicerie', label: '🛒 Alimentation' },
  { value: 'Mode / Beauté / Bien-être', label: '💅 Beauté / Mode' },
  { value: 'Maison / Décoration', label: '🏠 Maison / Déco' },
  { value: 'Loisirs / Culture', label: '🎭 Loisirs / Culture' },
  { value: 'Services', label: '🔧 Services' },
  { value: 'Autre', label: '📦 Autre' },
];

const SUGGESTIONS_AVANTAGE = [
  '-10% sur votre prochain achat',
  'Un café offert',
  '-15% pour les résidents',
  'Dessert offert pour 2 plats',
  '1ère séance offerte',
  'Livraison gratuite en ville',
];

const STEPS = [
  { num: 1, label: 'Commerce', icon: Store },
  { num: 2, label: 'Contact', icon: Mail },
  { num: 3, label: 'Offre', icon: Tag },
  { num: 4, label: 'Confirmation', icon: CheckCircle2 },
];

const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base bg-white';

export default function Rejoindre() {
  usePageMeta('Rejoindre le réseau');

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [villesPartenaires, setVillesPartenaires] = useState([]);

  const [form, setForm] = useState({
    nomCommerce: '', categorie: '', adresse: '', nomVille: '', departement: '',
    email: '', telephone: '', prenom: '', nom: '', password: '', confirmPassword: '',
    avantage: '', rgpd: false,
  });

  useEffect(() => {
    getVilles().then(setVillesPartenaires).catch(() => {});
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  }

  function canAdvance() {
    switch (step) {
      case 1: return form.nomCommerce && form.categorie && form.nomVille;
      case 2: return form.email && form.telephone && form.prenom && form.nom && form.password.length >= 6 && form.password === form.confirmPassword;
      case 3: return form.avantage && form.rgpd;
      default: return true;
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      // 1. Essayer de créer le compte auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { prenom: form.prenom, nom: form.nom } },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          // Compte existe — essayer de se connecter
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: form.email, password: form.password,
          });
          if (signInErr) {
            setError('Un compte existe avec cet email. Vérifiez le mot de passe ou connectez-vous d\'abord.');
            setLoading(false);
            return;
          }
        } else {
          setError('Erreur création compte : ' + authError.message);
          setLoading(false);
          return;
        }
      }

      // 2. Attendre que la session soit prête
      await new Promise((r) => setTimeout(r, 500));

      // 3. Créer le profil résident (silencieux si existe déjà)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: currentUser.id, email: form.email,
          prenom: form.prenom, nom: form.nom,
        }, { onConflict: 'id', ignoreDuplicates: true });
        if (profileErr) console.error('Profil non créé (non bloquant):', profileErr.message);
      }

      // 4. Créer la demande commerçant
      await creerDemandeCommercant({
        nom_commerce: form.nomCommerce, categorie: form.categorie,
        nom_ville: form.nomVille, departement: form.departement,
        adresse: form.adresse, telephone: form.telephone,
        email: form.email, avantage: form.avantage,
      });

      trackEvent('signup_completed', { role: 'commercant', ville: form.nomVille });
      setSubmitted(true);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('relation') && msg.includes('does not exist')) {
        setError('Table manquante en BDD. Contactez l\'administrateur.');
      } else if (msg.includes('permission denied') || msg.includes('violates row-level')) {
        setError('Erreur de permissions BDD. Contactez l\'administrateur.');
      } else {
        setError('Erreur : ' + (msg || 'Veuillez réessayer.'));
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Succès ──
  if (submitted) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 md:p-16 shadow-xl border border-gray-100 max-w-lg w-full text-center mx-4">
          <div className="w-20 h-20 rounded-full bg-green-100 text-vert flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="font-serif text-3xl font-bold text-texte mb-4">Demande envoyée !</h2>
          <p className="text-gray-600 mb-2">Merci <strong>{form.nomCommerce}</strong>.</p>
          <p className="text-gray-500 text-sm mb-8">Notre équipe traitera votre demande sous 48h. Vous recevrez un email de confirmation.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors">
            Retour à l'accueil
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Formulaire multi-step ──
  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-2xl mx-auto px-4">

        <Link to="/commercants" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-bleu transition-colors mb-6">
          <ArrowLeft size={16} /> Retour
        </Link>

        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">Rejoindre Réseaux-Résident</h1>
          <p className="text-gray-500">Inscription gratuite · Validation sous 48h</p>
        </div>

        {/* Barre de progression */}
        <div className="flex items-center justify-between mb-10 max-w-md mx-auto">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.num ? 'bg-vert text-white' :
                step === s.num ? 'bg-bleu text-white shadow-lg' :
                'bg-gray-200 text-gray-400'
              }`}>
                {step > s.num ? <CheckCircle2 size={18} /> : s.num}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-1 transition-all ${step > s.num ? 'bg-vert' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
        )}

        {/* Contenu de l'étape */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><Store size={20} className="text-bleu" /> Votre commerce</h2>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nom du commerce *</label>
                    <input name="nomCommerce" value={form.nomCommerce} onChange={handleChange} className={inputClass} required placeholder="Ex: Boulangerie du Port" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CATEGORIES.map((c) => (
                        <button key={c.value} type="button"
                          onClick={() => setForm((p) => ({ ...p, categorie: c.value }))}
                          className={`p-3 rounded-xl border text-sm font-medium text-center transition-all ${
                            form.categorie === c.value ? 'border-bleu bg-bleu/5 text-bleu' : 'border-gray-200 text-gray-600 hover:border-bleu/30'
                          }`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Adresse *</label>
                    <input name="adresse" value={form.adresse} onChange={handleChange} className={inputClass} required placeholder="12 rue du Commerce" />
                  </div>
                  <AutocompleteVille
                    id="nomVille" label="Ville *" value={form.nomVille}
                    onChange={(val) => setForm((p) => ({ ...p, nomVille: val }))}
                    onSelect={(s) => setForm((p) => ({ ...p, nomVille: s.nom, departement: s.departement || '' }))}
                    villesPartenaires={villesPartenaires}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><Mail size={20} className="text-bleu" /> Contact & Compte</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Prénom *</label>
                      <input name="prenom" value={form.prenom} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nom *</label>
                      <input name="nom" value={form.nom} onChange={handleChange} className={inputClass} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} required placeholder="contact@moncommerce.fr" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone *</label>
                    <input name="telephone" type="tel" value={form.telephone} onChange={handleChange} className={inputClass} required placeholder="04 94 00 00 00" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2"><Lock size={14} className="inline mr-1" />Mot de passe *</label>
                      <input name="password" type="password" value={form.password} onChange={handleChange} className={inputClass} required placeholder="6 car. minimum" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Confirmer *</label>
                      <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className={inputClass} required />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><Tag size={20} className="text-bleu" /> Votre avantage</h2>
                  <p className="text-sm text-gray-500">Quel avantage proposez-vous aux résidents ?</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {SUGGESTIONS_AVANTAGE.map((s) => (
                      <button key={s} type="button"
                        onClick={() => setForm((p) => ({ ...p, avantage: s }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          form.avantage === s ? 'border-or bg-or/10 text-or' : 'border-gray-200 text-gray-600 hover:border-or/40'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <textarea name="avantage" value={form.avantage} onChange={handleChange} rows={3}
                    className={inputClass + ' resize-none'} required placeholder="Décrivez l'avantage que vous offrez..." />
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input name="rgpd" type="checkbox" checked={form.rgpd} onChange={handleChange}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-bleu focus:ring-bleu" />
                    <span className="text-xs text-gray-500">J'accepte que mes données soient traitées par Réseaux-Résident conformément à la <Link to="/confidentialite" className="text-bleu underline">politique de confidentialité</Link>.</span>
                  </label>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><CheckCircle2 size={20} className="text-bleu" /> Récapitulatif</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Commerce</p>
                      <p className="font-bold text-texte">{form.nomCommerce}</p>
                      <p className="text-gray-500">{form.categorie}</p>
                      <p className="text-gray-500">{form.adresse}</p>
                      <p className="text-gray-500">{form.nomVille}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Contact</p>
                      <p className="font-bold text-texte">{form.prenom} {form.nom}</p>
                      <p className="text-gray-500">{form.email}</p>
                      <p className="text-gray-500">{form.telephone}</p>
                    </div>
                  </div>
                  <div className="bg-or/5 rounded-xl p-4 border border-or/20">
                    <p className="text-xs text-or uppercase tracking-wider mb-1 font-bold">Avantage proposé</p>
                    <p className="text-texte">{form.avantage}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button onClick={() => { setStep(step - 1); setError(null); }}
                className="flex items-center gap-2 px-5 py-2.5 text-gray-600 hover:text-texte transition-colors font-medium">
                <ArrowLeft size={16} /> Précédent
              </button>
            ) : <div />}

            {step < 4 ? (
              <button onClick={() => canAdvance() && setStep(step + 1)} disabled={!canAdvance()}
                className="flex items-center gap-2 px-6 py-2.5 bg-bleu text-white rounded-xl font-bold hover:bg-bleu-clair transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Suivant <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-vert text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Envoi...</> : <><CheckCircle2 size={18} /> Envoyer ma demande</>}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
