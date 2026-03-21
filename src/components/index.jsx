// ─── CarteVisuelle.jsx (version vitrine, pas de QR) ──────────
import { motion } from 'framer-motion';

export function CarteVisuelle({ ville = 'Sanary-sur-Mer', numero = 'SAN · 008431', expiration = '09/2026' }) {
  return (
    <div className="perspective-1000 w-[300px] sm:w-[320px] h-[190px] sm:h-[200px] mx-auto">
      <motion.div
        className="w-full h-full relative preserve-3d cursor-pointer"
        whileHover={{ rotateY: 8, rotateX: 4, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#0d2440] border border-white/10 p-5 sm:p-6 flex flex-col justify-between text-white backface-hidden">
          <div className="flex justify-between items-start">
            <div className="font-serif text-lg sm:text-xl font-bold tracking-wider">Carte Résident</div>
            <div className="text-[10px] sm:text-xs font-medium uppercase tracking-widest opacity-80 text-right max-w-[120px]">{ville}</div>
          </div>
          <div className="w-10 h-8 sm:w-12 sm:h-9 rounded bg-gradient-to-br from-[#e8b86d] to-[#c8963e] shadow-inner" />
          <div>
            <div className="font-mono text-base sm:text-lg tracking-[0.15em] sm:tracking-[0.2em] mb-2 text-white/90">{numero}</div>
            <div className="flex justify-between items-end">
              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/60">
                Valable jusqu'au<br />
                <span className="text-xs sm:text-sm text-white font-medium">{expiration}</span>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20" />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
}

// ─── CarteDigitale (version complète avec QR code intégré) ───
import { useState as useStateQR, useEffect as useEffectQR } from 'react';

export function CarteDigitale({ ville, numero, expiration, prenom, nom, formule, qrToken }) {
  const scanUrl = qrToken ? `${window.location.origin}/scan?token=${qrToken}` : null;
  const [qrDataUri, setQrDataUri] = useStateQR(null);

  useEffectQR(() => {
    if (!scanUrl) return;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(scanUrl, { width: 200, margin: 2, color: { dark: '#1a3a5c', light: '#ffffff' } })
        .then(setQrDataUri).catch(() => {});
    }).catch(() => {});
  }, [scanUrl]);

  return (
    <div className="w-[340px] mx-auto">
      <div className="rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#0d2440] border border-white/10 text-white">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div className="font-serif text-xl font-bold tracking-wider">Carte Résident</div>
            <div className="text-[10px] font-medium uppercase tracking-widest opacity-80 text-right">{ville}</div>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-9 rounded bg-gradient-to-br from-[#e8b86d] to-[#c8963e] shadow-inner" />
            <div className="text-sm text-blue-200 capitalize">{formule}</div>
          </div>
          <div className="font-mono text-xl tracking-[0.18em] mb-1">{numero}</div>
          <div className="text-sm text-blue-200">{prenom} {nom}</div>
        </div>

        {qrDataUri && (
          <div className="bg-white mx-4 mb-4 rounded-xl p-4 flex items-center gap-4">
            <img src={qrDataUri} alt="QR Code" className="w-24 h-24 rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Scanner pour valider</div>
              <p className="text-xs text-gray-500 leading-relaxed">Présentez ce QR code au commerçant pour enregistrer votre visite.</p>
            </div>
          </div>
        )}

        <div className="px-6 pb-5 flex justify-between items-end">
          <div className="text-[10px] uppercase tracking-wider text-white/60">
            Valable jusqu'au<br />
            <span className="text-sm text-white font-medium">{expiration}</span>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SearchVille.jsx ──────────────────────────────────────────
// Combines Supabase partenaire villes + API gouv for any French city
import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVilles } from '../hooks/useData';
import { rechercherVille } from '../lib/adresse-gouv';

export function SearchVille() {
  const [query, setQuery] = useState('');
  const [partenaires, setPartenaires] = useState([]);
  const [gouvResults, setGouvResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingGouv, setLoadingGouv] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const { data: villes } = useVilles();

  // Filter partenaire villes (instant, local)
  useEffect(() => {
    if (!query.trim() || !villes) { setPartenaires([]); return; }
    const q = query.toLowerCase();
    setPartenaires(villes.filter((v) => v.nom.toLowerCase().includes(q) || v.departement?.toLowerCase().includes(q)));
  }, [query, villes]);

  // Search API gouv (debounced)
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setGouvResults([]); setIsOpen(false); return; }
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingGouv(true);
      const results = await rechercherVille(query, { limit: 6 });
      // Remove duplicates with partenaires
      const partenaireNoms = new Set((villes || []).map((v) => v.nom.toLowerCase()));
      const filtered = results.filter((r) => !partenaireNoms.has(r.nom.toLowerCase()));
      setGouvResults(filtered);
      setLoadingGouv(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, villes]);

  useEffect(() => {
    function handleClick(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasResults = partenaires.length > 0 || gouvResults.length > 0;

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search size={22} className="absolute left-4 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-gray-200 focus:border-or focus:ring-4 focus:ring-or/20 transition-all outline-none shadow-sm bg-white"
          placeholder="Rechercher votre ville partout en France..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          aria-label="Rechercher votre ville" aria-expanded={isOpen} aria-autocomplete="list" role="combobox"
        />
        {loadingGouv && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-or border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-40 max-h-96 overflow-y-auto" role="listbox">
          {/* Partenaire villes first */}
          {partenaires.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">Villes partenaires</div>
              <ul className="divide-y divide-gray-100">
                {partenaires.map((ville) => (
                  <li key={ville.id} role="option">
                    <Link to={`/villes/${ville.slug}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                      onClick={() => { setIsOpen(false); setQuery(''); }}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${ville.statut === 'actif' ? 'bg-blue-50 text-bleu' : 'bg-gray-100 text-gray-500'}`}>
                          <MapPin size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg text-texte">{ville.nom}</div>
                          <div className="text-sm text-gray-500">{ville.departement}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${ville.statut === 'actif' ? 'bg-green-100 text-vert' : 'bg-gray-100 text-gray-500'}`}>
                          {ville.statut === 'actif' ? 'Disponible' : 'Bientôt'}
                        </span>
                        <ArrowRight size={18} className="text-gray-300 group-hover:text-or transition-colors" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {/* Other French cities from API gouv */}
          {gouvResults.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100">Autres villes en France</div>
              <ul className="divide-y divide-gray-100">
                {gouvResults.map((r, i) => (
                  <li key={`gouv-${i}`} role="option">
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 text-gray-400">
                          <Building2 size={20} aria-hidden="true" />
                        </div>
                        <div>
                          <div className="font-semibold text-texte">{r.nom}</div>
                          <div className="text-sm text-gray-500">{r.codePostal} · {r.departement}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-orange-50 text-or">
                        Pas encore
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {/* No results */}
          {!hasResults && query.length >= 2 && !loadingGouv && (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-lg mb-4">Aucune ville trouvée.</p>
              <Link to="/commercants/rejoindre" className="text-bleu font-semibold hover:text-or transition-colors underline underline-offset-4" onClick={() => setIsOpen(false)}>
                Demandez le lancement dans votre ville →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VilleCard.jsx ────────────────────────────────────────────
export function VilleCard({ ville }) {
  const isActif = ville.statut === 'actif';
  return (
    <Link to={`/villes/${ville.slug}`}
      className={`block rounded-2xl p-6 border-2 transition-all group ${isActif ? 'bg-bleu border-bleu hover:bg-bleu-clair hover:border-bleu-clair hover:-translate-y-1 shadow-lg hover:shadow-xl' : 'bg-white border-dashed border-gray-300 hover:border-gray-400 cursor-default opacity-75'}`}
      tabIndex={isActif ? 0 : -1} aria-label={`${ville.nom} — ${isActif ? 'Ville active' : 'Bientôt disponible'}`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className={`font-serif text-xl font-bold ${isActif ? 'text-white' : 'text-texte'}`}>{ville.nom}</h3>
        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${isActif ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {isActif ? 'Actif' : 'Bientôt'}
        </span>
      </div>
      {isActif && (
        <div className="space-y-1">
          <p className="text-blue-200 text-sm">{ville.commerces_partenaires} commerces partenaires</p>
          <p className="text-blue-200 text-sm">{ville.cartes_actives} résidents équipés</p>
        </div>
      )}
      {!isActif && <p className="text-gray-500 text-sm">{ville.description}</p>}
    </Link>
  );
}

// ─── CommercantCard.jsx ───────────────────────────────────────
import { Store, MapPin as MapPinIcon, Tag } from 'lucide-react';

export function CommercantCard({ commerce }) {
  return (
    <article className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-or/30 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gris-clair flex items-center justify-center text-bleu shrink-0">
          <Store size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-bold text-texte truncate">{commerce.nom}</h3>
          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded mt-1">{commerce.categorie}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <Tag size={16} className="text-or shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-texte font-medium">{commerce.avantage}</span>
        </div>
        {commerce.adresse && (
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <MapPinIcon size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{commerce.adresse}</span>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── StatsWidget.jsx ──────────────────────────────────────────
import { useRef as useRefSW, useEffect as useEffectSW, useState as useStateSW } from 'react';
import { motion as motionSW, useInView } from 'framer-motion';

export function StatsWidget({ endValue, suffix = '', label }) {
  const [count, setCount] = useStateSW(0);
  const ref = useRefSW(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffectSW(() => {
    if (!isInView || endValue === 0) { setCount(endValue); return; }
    const duration = 1500;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * endValue));
      if (progress < 1) requestAnimationFrame(tick);
    }
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isInView, endValue]);

  return (
    <motionSW.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
      className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
      <div className="font-serif text-5xl font-bold text-bleu mb-2" aria-live="polite">{count}{suffix}</div>
      <div className="text-gray-600 font-medium uppercase tracking-wider text-sm">{label}</div>
    </motionSW.div>
  );
}

// ─── TarifsSection.jsx ────────────────────────────────────────
import { Check, Phone } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

const TARIFS = [
  { id: 'individuel', label: 'Individuel', prix: 10, cartes: 1, featured: false, avantages: ['1 carte physique ou digitale', 'Tous les commerces partenaires', 'Avantages illimités', 'Valable 1 an'] },
  { id: 'couple', label: 'Couple', prix: 15, cartes: 2, featured: true, avantages: ['2 cartes physiques ou digitales', 'Tous les commerces partenaires', 'Avantages illimités', 'Économisez 5€'] },
  { id: 'secondaire', label: 'Résident secondaire', prix: 20, cartes: 1, featured: false, avantages: ['1 carte physique ou digitale', 'Tous les commerces partenaires', 'Soutenez votre ville de cœur', 'Valable toute l\'année'] },
];

export function TarifsSection() {
  return (
    <section id="tarifs" className="py-24 bg-bleu text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">Des tarifs simples et transparents</h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">Un abonnement annuel unique pour soutenir votre ville et profiter d'avantages toute l'année.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {TARIFS.map((tarif) => (
            <div key={tarif.id} className={`relative rounded-3xl p-8 flex flex-col ${tarif.featured ? 'bg-or text-white shadow-[0_20px_40px_rgba(200,150,62,0.3)] lg:-translate-y-4' : 'bg-white/10 text-white border border-white/20'}`}>
              {tarif.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-or text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">Le plus choisi</div>
              )}
              <div className="mb-8">
                <h3 className="font-serif text-xl font-bold mb-3">{tarif.label}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold">{tarif.prix}€</span>
                  <span className="text-sm opacity-70">/ an</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                {tarif.avantages.map((av, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={18} className="shrink-0 mt-0.5 opacity-90" aria-hidden="true" />
                    <span className="opacity-90">{av}</span>
                  </li>
                ))}
              </ul>
              <RouterLink to={`/inscription?formule=${tarif.id}`}
                className={`w-full py-4 rounded-xl font-bold text-center transition-colors ${tarif.featured ? 'bg-white text-or hover:bg-gray-50' : 'bg-or text-white hover:bg-or-clair'}`}>
                Choisir cette formule
              </RouterLink>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-white/5 rounded-2xl p-8 border border-white/10">
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-serif text-2xl font-bold mb-2">Vous préférez commander par téléphone ?</h3>
            <p className="text-blue-100">Paiement par chèque ou virement accepté. Livraison sous 5 jours.</p>
          </div>
          <div className="flex items-center gap-4 bg-white/10 px-6 py-4 rounded-xl border border-white/20 shrink-0">
            <Phone size={32} className="text-or-clair" aria-hidden="true" />
            <div>
              <div className="text-sm text-blue-200 uppercase tracking-wider font-semibold mb-1">Appel gratuit</div>
              <a href="tel:0494000000" className="text-2xl font-bold hover:text-or-clair transition-colors">04 94 00 00 00</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── OffrirCarte.jsx ──────────────────────────────────────────
import { Gift } from 'lucide-react';
import { Link as RouterLink2 } from 'react-router-dom';

export function CartesCadeaux() {
  return (
    <section id="cartes-cadeaux" className="py-24 bg-gris-clair">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm text-or mb-8">
          <Gift size={32} aria-hidden="true" />
        </div>
        <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6">Offrir une carte à vos proches</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Faites découvrir les commerces de votre ville à un ami, un voisin ou un membre de votre famille en lui offrant une Carte Résident.
        </p>
        <div className="bg-white rounded-3xl p-8 md:p-10 border border-gray-100 shadow-sm max-w-xl mx-auto mb-10">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { formule: 'individuel', nom: 'Individuel', prix: '10€', label: '1 carte' },
              { formule: 'couple', nom: 'Couple', prix: '15€', label: '2 cartes' },
              { formule: 'secondaire', nom: 'Rés. secondaire', prix: '20€', label: '1 carte' },
            ].map((f) => (
              <RouterLink2 key={f.formule} to={`/inscription?formule=${f.formule}`}
                className="rounded-2xl bg-gradient-to-br from-bleu to-bleu-clair p-4 sm:p-5 flex flex-col items-center justify-center shadow-lg hover:-translate-y-1 transition-transform text-white min-h-[120px]">
                <div className="text-xs text-white font-bold uppercase tracking-wider mb-2">{f.nom}</div>
                <div className="font-serif text-3xl font-bold">{f.prix}</div>
                <div className="text-xs text-blue-200 mt-1">{f.label}</div>
              </RouterLink2>
            ))}
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            Choisissez une formule, renseignez les coordonnées du bénéficiaire, et la carte sera envoyée directement. Idéal pour Noël, anniversaires ou la fête des mères.
          </p>
        </div>
        <RouterLink2 to="/inscription"
          className="inline-flex items-center gap-2 px-8 py-4 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors shadow-md">
          <Gift size={20} aria-hidden="true" /> Offrir une Carte Résident
        </RouterLink2>
      </div>
    </section>
  );
}
