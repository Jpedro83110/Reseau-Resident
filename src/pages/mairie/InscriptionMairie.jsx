// src/pages/mairie/InscriptionMairie.jsx
// Page d'inscription mairie — landing premium + formulaire multi-step
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { trackEvent } from '../../lib/analytics';
import { BarChart3, Settings, FileDown, Building2, User, MessageCircle, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { creerDemandeMairie } from '../../lib/api';
import usePageMeta from '../../hooks/usePageMeta';

const FONCTIONS = [
  'Maire', 'Adjoint(e) au Maire', 'Directeur(rice) Général(e) des Services',
  'Responsable Commerce', 'Responsable Numérique', 'Responsable Vie Associative', 'Agent territorial', 'Autre',
];

const STEPS = [
  { num: 1, label: 'Commune', icon: Building2 },
  { num: 2, label: 'Contact', icon: User },
  { num: 3, label: 'Motivation', icon: MessageCircle },
  { num: 4, label: 'Confirmation', icon: CheckCircle2 },
];

const inputClass = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base bg-white';

const BENEFITS = [
  { icon: BarChart3, title: 'Pilotez votre territoire', desc: 'Tableau de bord avec statistiques en temps réel sur l\'activité économique et associative.' },
  { icon: Settings, title: 'Gestion simplifiée', desc: 'Actualités, événements, défis citoyens et commerces depuis un seul espace.' },
  { icon: FileDown, title: 'Statistiques & Export', desc: 'Exportez des bilans mensuels détaillés pour vos rapports et conseils municipaux.' },
];

export default function InscriptionMairie() {
  usePageMeta('Inscription Mairie', 'Rejoignez Réseaux-Résident et pilotez la vie locale de votre commune.');

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    nomCommune: '', codePostal: '', departement: '', population: '',
    prenom: '', nom: '', fonction: '', email: '', telephone: '',
    password: '', confirmPassword: '',
    motivation: '', siteWeb: '', rgpd: false,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  }

  function canAdvance() {
    switch (step) {
      case 1: return form.nomCommune && form.codePostal.length === 5;
      case 2: return form.prenom && form.nom && form.fonction && form.email && form.password.length >= 6 && form.password === form.confirmPassword;
      case 3: return form.rgpd;
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
        options: { data: { prenom: form.prenom, nom: form.nom, type: 'mairie' } },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          // Le compte existe déjà — essayer de se connecter
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

      // 2. Attendre que la session soit disponible
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

      // 4. Upload logo si present (fallback base64 si pas de bucket)
      let logoUrl = null;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const path = `logos/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('villes-logos').upload(path, logoFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('villes-logos').getPublicUrl(path);
          logoUrl = urlData?.publicUrl || null;
        } else {
          // Fallback base64
          logoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(logoFile);
          });
        }
      }

      // 5. Créer la demande mairie
      await creerDemandeMairie({
        nom_commune: form.nomCommune, code_postal: form.codePostal,
        departement: form.departement, population: form.population ? parseInt(form.population) : null,
        nom_responsable: form.nom, prenom_responsable: form.prenom,
        fonction: form.fonction, email: form.email,
        telephone: form.telephone, motivation: form.motivation,
        site_web: form.siteWeb, logo_url: logoUrl,
      });

      trackEvent('signup_completed', { role: 'mairie', commune: form.nomCommune });
      setSubmitted(true);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('relation') && msg.includes('does not exist')) {
        setError('Table manquante en BDD. L\'administrateur doit exécuter migration-v9-mairie-inscription.sql dans Supabase.');
      } else if (msg.includes('permission denied') || msg.includes('violates row-level')) {
        setError('Erreur de permissions. Vérifiez que la migration SQL a bien été exécutée.');
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
          <h2 className="font-serif text-3xl font-bold text-texte mb-4">Candidature envoyée !</h2>
          <p className="text-gray-600 mb-2">Merci pour l'intérêt de <strong>{form.nomCommune}</strong>.</p>
          <p className="text-gray-500 text-sm mb-8">Notre équipe vous contactera sous 5 jours ouvrés pour organiser le déploiement.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors">
              Explorer la plateforme
            </Link>
            <Link to="/connexion" className="px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Se connecter
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-4xl mx-auto px-4">

        {/* Landing header */}
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bleu/10 text-bleu text-sm font-bold mb-4">
              <Building2 size={16} /> Espace collectivités
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-4">
              Faites de votre ville un<br /><span className="text-bleu">territoire connecté</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Rejoignez Réseaux-Résident et offrez à vos résidents, commerçants et associations un outil de vie locale moderne.
            </p>
          </motion.div>
        </div>

        {/* 3 bénéfices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {BENEFITS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-bleu/10 flex items-center justify-center text-bleu mb-4">
                <Icon size={24} />
              </div>
              <h3 className="font-serif text-lg font-bold text-texte mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.num ? 'bg-vert text-white' : step === s.num ? 'bg-bleu text-white shadow-lg' : 'bg-gray-200 text-gray-400'
              }`}>
                {step > s.num ? <CheckCircle2 size={18} /> : s.num}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-1 transition-all ${step > s.num ? 'bg-vert' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm max-w-2xl mx-auto">{error}</div>}

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              {step === 1 && (
                <div className="space-y-5">
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><Building2 size={20} className="text-bleu" /> Votre commune</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nom de la commune *</label>
                      <input name="nomCommune" value={form.nomCommune} onChange={handleChange} className={inputClass} required placeholder="Ex: Sanary-sur-Mer" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Code postal *</label>
                      <input name="codePostal" value={form.codePostal} onChange={handleChange} className={inputClass} required maxLength={5} placeholder="83110" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Département</label>
                      <input name="departement" value={form.departement} onChange={handleChange} className={inputClass} placeholder="Var" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Population estimée</label>
                      <input name="population" type="number" value={form.population} onChange={handleChange} className={inputClass} placeholder="16 000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Site web de la mairie</label>
                    <input name="siteWeb" value={form.siteWeb} onChange={handleChange} className={inputClass} placeholder="https://www.ville-sanary.fr" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Logo de la commune</label>
                    <div className="flex items-center gap-4">
                      {logoPreview && (
                        <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain rounded-xl border border-gray-200" />
                      )}
                      <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-bleu/40 cursor-pointer transition-colors text-sm text-gray-500">
                        <span>{logoFile ? logoFile.name : 'Choisir un fichier (PNG, JPG, SVG)'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size <= 2 * 1024 * 1024) {
                            setLogoFile(file);
                            setLogoPreview(URL.createObjectURL(file));
                          } else if (file) {
                            setError('Le logo ne doit pas dépasser 2 Mo.');
                          }
                        }} />
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Optionnel. Max 2 Mo. Sera affiché sur la page de votre ville.</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><User size={20} className="text-bleu" /> Responsable & Compte</h2>
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
                    <label className="block text-sm font-bold text-gray-700 mb-2">Fonction *</label>
                    <select name="fonction" value={form.fonction} onChange={handleChange} className={inputClass} required>
                      <option value="">-- Sélectionner --</option>
                      {FONCTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email professionnel *</label>
                      <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} required placeholder="contact@mairie.fr" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
                      <input name="telephone" type="tel" value={form.telephone} onChange={handleChange} className={inputClass} placeholder="04 94 ..." />
                    </div>
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
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><MessageCircle size={20} className="text-bleu" /> Motivation</h2>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Pourquoi souhaitez-vous rejoindre Réseaux-Résident ?</label>
                    <textarea name="motivation" value={form.motivation} onChange={handleChange} rows={4}
                      className={inputClass + ' resize-none'} placeholder="Décrivez vos objectifs pour la vie locale de votre commune..." />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input name="rgpd" type="checkbox" checked={form.rgpd} onChange={handleChange}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-bleu focus:ring-bleu" />
                    <span className="text-xs text-gray-500">J'accepte les <Link to="/cgv" className="text-bleu underline">conditions d'utilisation</Link> et la <Link to="/confidentialite" className="text-bleu underline">politique de confidentialité</Link>.</span>
                  </label>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2"><CheckCircle2 size={20} className="text-bleu" /> Récapitulatif</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Commune</p>
                      <p className="font-bold text-texte">{form.nomCommune}</p>
                      <p className="text-gray-500">{form.codePostal} {form.departement}</p>
                      {form.population && <p className="text-gray-500">{parseInt(form.population).toLocaleString('fr-FR')} habitants</p>}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Responsable</p>
                      <p className="font-bold text-texte">{form.prenom} {form.nom}</p>
                      <p className="text-gray-500">{form.fonction}</p>
                      <p className="text-gray-500">{form.email}</p>
                    </div>
                  </div>
                  {form.motivation && (
                    <div className="bg-bleu/5 rounded-xl p-4 border border-bleu/10">
                      <p className="text-xs text-bleu uppercase tracking-wider mb-1 font-bold">Motivation</p>
                      <p className="text-sm text-gray-600">{form.motivation}</p>
                    </div>
                  )}
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
                {loading ? <><Loader2 size={18} className="animate-spin" /> Envoi...</> : <><CheckCircle2 size={18} /> Soumettre ma candidature</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
