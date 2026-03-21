import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CreditCard, ChevronRight, CheckCircle2, Phone, Smartphone, CreditCard as CardIcon } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise, STRIPE_PRICES } from '../../lib/stripe';
import { creerInscription, confirmerPaiement, getVilles } from '../../lib/api';
import AutocompleteAdresse from '../../components/AutocompleteAdresse';
import AutocompleteVille from '../../components/AutocompleteVille';
import { CarteDigitale } from '../../components/index';

const TARIFS = Object.entries(STRIPE_PRICES).map(([id, t]) => ({
  id, label: t.label, prix: t.montant / 100, cartes: t.cartes,
}));

const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none transition-all text-base";

// ── ProgressBar ──────────────────────────────────────────────
function ProgressBar({ step }) {
  const labels = ['Formule', 'Informations', 'Paiement', 'Confirmation'];
  return (
    <div className="mb-12" aria-label={`Étape ${step} sur 4`}>
      <div className="flex justify-between relative">
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 z-0" />
        <div className="absolute top-5 left-0 h-1 bg-or z-0 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }} />
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative z-10 transition-colors duration-300 ${step >= n ? 'bg-or text-white shadow-md' : 'bg-white text-gray-400 border-2 border-gray-200'}`}>
            {step > n ? <Check size={18} aria-hidden="true" /> : n}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 text-sm font-medium text-gray-400">
        {labels.map((l, i) => <span key={i} className={step >= i + 1 ? 'text-texte' : ''}>{l}</span>)}
      </div>
    </div>
  );
}

// ── Step 1: Formule ──────────────────────────────────────────
function StepFormule({ formData, setFormData, onNext }) {
  return (
    <div className="p-8 md:p-12">
      <h2 className="font-serif text-3xl font-bold text-texte mb-8">Choisissez votre formule</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {TARIFS.map((t) => (
          <button key={t.id} onClick={() => setFormData((p) => ({ ...p, formule: t.id }))}
            className={`text-left p-6 rounded-2xl border-2 transition-all ${formData.formule === t.id ? 'border-or bg-orange-50/50 shadow-md' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-serif text-xl font-bold">{t.label}</h3>
              {formData.formule === t.id && <CheckCircle2 size={22} className="text-or" aria-hidden="true" />}
            </div>
            <div className="text-3xl font-bold text-bleu mb-1">{t.prix}€ <span className="text-sm text-gray-500 font-normal">/ an</span></div>
            <p className="text-sm text-gray-500">{t.cartes} carte{t.cartes > 1 ? 's' : ''} physique{t.cartes > 1 ? 's' : ''} ou digitale{t.cartes > 1 ? 's' : ''}</p>
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={onNext} className="px-8 py-4 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors flex items-center gap-2">
          Continuer <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Informations ─────────────────────────────────────
function StepInfos({ formData, setFormData, onNext, onPrev, villesActives }) {
  const handleField = (name, value) => setFormData((p) => ({ ...p, [name]: value }));
  const canNext = formData.prenom && formData.nom && formData.email && formData.ville && formData.rgpd && (formData.retraitCommerce || formData.adresse || formData.typeCarte === 'digitale');

  return (
    <div className="p-8 md:p-12">
      <h2 className="font-serif text-3xl font-bold text-texte mb-8">Vos informations</h2>
      <div className="space-y-6 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="prenom" className="block text-sm font-bold text-gray-700 mb-2">Prénom *</label>
            <input id="prenom" type="text" value={formData.prenom} onChange={(e) => handleField('prenom', e.target.value)} placeholder="Marie" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="nom" className="block text-sm font-bold text-gray-700 mb-2">Nom *</label>
            <input id="nom" type="text" value={formData.nom} onChange={(e) => handleField('nom', e.target.value)} placeholder="Dupont" required className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
            <input id="email" type="email" value={formData.email} onChange={(e) => handleField('email', e.target.value)} placeholder="marie@exemple.fr" required className={inputClass} />
          </div>
          <div>
            <label htmlFor="telephone" className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
            <input id="telephone" type="tel" value={formData.telephone} onChange={(e) => handleField('telephone', e.target.value)} placeholder="06 00 00 00 00" className={inputClass} />
          </div>
        </div>

        <div>
          <AutocompleteVille id="ville" label="Ville de résidence (rattachée à votre carte)"
            value={formData.villeNom || ''} onChange={(val) => setFormData((p) => ({ ...p, villeNom: val }))}
            onSelect={(v) => {
              const match = villesActives.find((va) => va.nom.toLowerCase() === v.nom.toLowerCase());
              if (match) setFormData((p) => ({ ...p, ville: match.slug, villeNom: match.nom }));
              else setFormData((p) => ({ ...p, ville: '', villeNom: v.nom }));
            }}
            villesPartenaires={villesActives} placeholder="Tapez le nom de votre ville..." required />
          {formData.villeNom && !formData.ville && (
            <p className="text-sm text-orange-600 mt-2">Cette ville n'est pas encore active.</p>
          )}
        </div>

        {/* Type de carte */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="font-bold text-lg mb-4">Type de carte</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'physique', label: 'Carte physique', desc: 'Dans votre portefeuille', icon: <CardIcon size={20} /> },
              { value: 'digitale', label: 'Carte digitale', desc: 'QR code sur téléphone', icon: <Smartphone size={20} /> },
              { value: 'les_deux', label: 'Les deux', desc: 'Physique + QR code', icon: <Check size={20} /> },
            ].map((opt) => (
              <label key={opt.value}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer text-center transition-all ${formData.typeCarte === opt.value ? 'border-or bg-orange-50/30' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="typeCarte" value={opt.value} checked={formData.typeCarte === opt.value}
                  onChange={() => setFormData((p) => ({ ...p, typeCarte: opt.value }))} className="sr-only" />
                <div className={`p-2 rounded-lg ${formData.typeCarte === opt.value ? 'text-or' : 'text-gray-400'}`}>{opt.icon}</div>
                <div className="font-bold text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500">{opt.desc}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Livraison */}
        {formData.typeCarte !== 'digitale' && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-bold text-lg mb-4">Livraison de votre carte physique</h3>
            <div className="space-y-3">
              {[
                { value: false, label: 'Envoi par courrier postal (gratuit)', desc: 'Sous 5 jours ouvrés.' },
                { value: true, label: 'Retrait chez un commerçant partenaire', desc: 'Immédiatement.' },
              ].map((opt) => (
                <label key={String(opt.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${formData.retraitCommerce === opt.value ? 'border-or bg-orange-50/30' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="retrait" checked={formData.retraitCommerce === opt.value}
                    onChange={() => setFormData((p) => ({ ...p, retraitCommerce: opt.value }))} className="mt-1 w-4 h-4 accent-or" />
                  <div><div className="font-bold">{opt.label}</div><div className="text-sm text-gray-500 mt-0.5">{opt.desc}</div></div>
                </label>
              ))}
            </div>
            {!formData.retraitCommerce && (
              <div className="mt-4">
                <AutocompleteAdresse id="adresse" label="Adresse postale" value={formData.adresse}
                  onChange={(val) => setFormData((p) => ({ ...p, adresse: val }))}
                  onSelect={(a) => setFormData((p) => ({ ...p, adresse: a.label }))}
                  placeholder="Commencez à taper votre adresse..." required />
              </div>
            )}
          </div>
        )}

        {/* RGPD */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={formData.rgpd} onChange={(e) => setFormData((p) => ({ ...p, rgpd: e.target.checked }))}
            className="mt-1 w-4 h-4 rounded accent-or" required />
          <span className="text-sm text-gray-600">
            J'accepte les <Link to="/cgv" className="underline text-bleu">Conditions Générales</Link> et la{' '}
            <Link to="/confidentialite" className="underline text-bleu">politique de confidentialité</Link>.
          </span>
        </label>
      </div>

      <div className="flex justify-between">
        <button onClick={onPrev} className="px-6 py-4 text-gray-500 font-bold hover:text-texte transition-colors">Retour</button>
        <button onClick={onNext} disabled={!canNext}
          className="px-8 py-4 bg-bleu hover:bg-bleu-clair disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2">
          Continuer <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── Stripe Form ──────────────────────────────────────────────
function StripeForm({ formData, carteId, onSuccess, onPrev }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (stripeError) { setError(stripeError.message); setLoading(false); return; }
    if (paymentIntent?.status === 'succeeded') {
      try {
        await confirmerPaiement(carteId, paymentIntent.id);
        // Envoyer l'email de confirmation (non-bloquant — on ne fait pas échouer le flux si l'email rate)
        fetch('/api/send-confirmation-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email, prenom: formData.prenom, numero: formData.numeroCarte,
            ville: formData.villeNom, formule: formData.formule,
            qrToken: formData.qrToken, typeCarte: formData.typeCarte,
          }),
        }).catch(() => {}); // Silencieux si l'email échoue
        onSuccess();
      }
      catch { setError('Erreur de confirmation. Contactez-nous.'); }
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs', defaultValues: { billingDetails: { email: formData.email } } }} />
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
      <div className="flex justify-between pt-4">
        <button type="button" onClick={onPrev} className="px-6 py-4 text-gray-500 font-bold hover:text-texte transition-colors">Retour</button>
        <button type="submit" disabled={!stripe || loading}
          className="px-8 py-4 bg-or hover:bg-or-clair disabled:opacity-60 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2">
          {loading ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Traitement...</>)
            : (<><CreditCard size={20} /> Payer {STRIPE_PRICES[formData.formule]?.montant / 100}€</>)}
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Paiement ─────────────────────────────────────────
function StepPaiement({ formData, setFormData, onSuccess, onPrev }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [carteId, setCarteId] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [setupError, setSetupError] = useState(null);
  const formRef = useRef(formData);
  formRef.current = formData;
  const tarif = STRIPE_PRICES[formData.formule];

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      const fd = formRef.current;
      try {
        const carte = await creerInscription({
          formule: fd.formule, ville_slug: fd.ville, prenom: fd.prenom, nom: fd.nom,
          email: fd.email, telephone: fd.telephone, adresse: fd.adresse,
          retrait_commerce: fd.retraitCommerce, type_carte: fd.typeCarte,
        });
        if (cancelled) return;
        setCarteId(carte.id);
        setFormData((p) => ({ ...p, numeroCarte: carte.numero, qrToken: carte.qr_token }));
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ montant: tarif.montant, email: fd.email, carte_id: carte.id, description: tarif.label }),
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Impossible de créer le paiement'); }
        const { clientSecret: cs } = await res.json();
        if (!cancelled) setClientSecret(cs);
      } catch (err) { if (!cancelled) setSetupError(err.message); }
      finally { if (!cancelled) setLoadingSetup(false); }
    }
    setup();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-8 md:p-12">
      <h2 className="font-serif text-3xl font-bold text-texte mb-8">Paiement sécurisé</h2>
      <div className="flex flex-col md:flex-row gap-10">
        <div className="md:w-64 shrink-0">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-lg mb-4">Récapitulatif</h3>
            <div className="flex justify-between mb-2 text-sm"><span className="text-gray-600">{tarif?.label}</span><span className="font-bold">{(tarif?.montant ?? 0) / 100}€</span></div>
            <div className="flex justify-between text-sm pb-4 mb-4 border-b border-gray-200"><span className="text-gray-600">Livraison</span><span className="font-bold text-vert">Offerte</span></div>
            <div className="flex justify-between text-lg"><span className="font-bold">Total</span><span className="font-bold text-bleu">{(tarif?.montant ?? 0) / 100}€</span></div>
          </div>
          <div className="mt-4 bg-blue-50 rounded-2xl p-5 border border-blue-100 text-sm text-bleu">
            <div className="flex items-center gap-2 font-bold mb-2"><Phone size={16} /> Par chèque</div>
            <p className="text-gray-600">Appelez le <a href="tel:0494000000" className="font-bold underline">04 94 00 00 00</a></p>
          </div>
        </div>
        <div className="flex-1">
          {loadingSetup ? (
            <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-or border-t-transparent rounded-full animate-spin" /></div>
          ) : setupError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">{setupError}<button onClick={onPrev} className="block mt-3 text-sm underline">Retour</button></div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#c8963e', borderRadius: '12px', fontFamily: '"Source Sans 3", sans-serif' } } }}>
              <StripeForm formData={formData} carteId={carteId} onSuccess={onSuccess} onPrev={onPrev} />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Confirmation avec la vraie carte digitale ────────
function StepConfirmation({ formData }) {
  const isDigital = formData.typeCarte === 'digitale' || formData.typeCarte === 'les_deux';
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 1);
  const expStr = `${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 md:p-16 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 text-vert flex items-center justify-center mx-auto mb-8">
        <Check size={48} strokeWidth={3} aria-hidden="true" />
      </div>
      <h2 className="font-serif text-4xl font-bold text-texte mb-4">Félicitations {formData.prenom} !</h2>
      <p className="text-xl text-gray-600 mb-10 max-w-lg mx-auto">
        Votre Carte Résident a bien été créée. Un email de confirmation avec votre carte a été envoyé à <strong>{formData.email}</strong>.
        {formData.typeCarte !== 'digitale' && ' Votre carte physique sera envoyée sous 5 jours.'}
      </p>

      {/* La vraie carte digitale avec QR code intégré */}
      {formData.numeroCarte && (
        <div className="mb-8">
          <CarteDigitale
            ville={formData.villeNom || 'Ma ville'}
            numero={formData.numeroCarte}
            expiration={expStr}
            prenom={formData.prenom}
            nom={formData.nom}
            formule={formData.formule}
            qrToken={isDigital ? formData.qrToken : null}
          />
        </div>
      )}

      {isDigital && (
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          Faites une capture d'écran de cette carte ou téléchargez le QR code ci-dessous pour le montrer aux commerçants partenaires.
        </p>
      )}

      {!isDigital && formData.numeroCarte && (
        <p className="text-sm text-gray-500 mb-6">
          Conservez votre numéro de carte <strong>{formData.numeroCarte}</strong> en attendant de recevoir votre carte physique.
        </p>
      )}

      <Link to={formData.ville ? `/villes/${formData.ville}` : '/'}
        className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl text-white bg-bleu hover:bg-bleu-clair transition-colors shadow-lg">
        Découvrir mes avantages →
      </Link>
    </motion.div>
  );
}

// ── Page principale ──────────────────────────────────────────
export default function Inscription() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [villesActives, setVillesActives] = useState([]);
  const [formData, setFormData] = useState({
    formule: searchParams.get('formule') || 'individuel',
    ville: searchParams.get('ville') || '',
    villeNom: '',
    typeCarte: 'physique',
    prenom: '', nom: '', email: '', telephone: '', adresse: '',
    retraitCommerce: false, rgpd: false, numeroCarte: null, qrToken: null,
  });

  useEffect(() => {
    let cancelled = false;
    getVilles().then((villes) => {
      if (!cancelled) {
        const actives = villes.filter((v) => v.statut === 'actif');
        setVillesActives(actives);
        const villeParam = searchParams.get('ville');
        if (villeParam) {
          const match = actives.find((v) => v.slug === villeParam);
          if (match) setFormData((p) => ({ ...p, ville: match.slug, villeNom: match.nom }));
        }
      }
    }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProgressBar step={step} />
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><StepFormule formData={formData} setFormData={setFormData} onNext={next} /></motion.div>}
            {step === 2 && <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><StepInfos formData={formData} setFormData={setFormData} onNext={next} onPrev={prev} villesActives={villesActives} /></motion.div>}
            {step === 3 && <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><StepPaiement formData={formData} setFormData={setFormData} onSuccess={next} onPrev={prev} /></motion.div>}
            {step === 4 && <motion.div key="s4" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}><StepConfirmation formData={formData} /></motion.div>}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
