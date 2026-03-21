import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, Tag, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { creerDemandeCommercant, getVilles } from '../../lib/api';
import AutocompleteAdresse from '../../components/AutocompleteAdresse';
import AutocompleteVille from '../../components/AutocompleteVille';

const CATEGORIES = [
  'Restauration / Bar / Café', 'Boulangerie / Pâtisserie', 'Alimentation / Épicerie',
  'Mode / Beauté / Bien-être', 'Maison / Décoration', 'Loisirs / Culture', 'Services', 'Autre',
];

export default function Rejoindre() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [villesPartenaires, setVillesPartenaires] = useState([]);

  const [formData, setFormData] = useState({
    nomCommerce: '', categorie: '', nomVille: '', departement: '',
    adresse: '', telephone: '', email: '', avantage: '', siret: '', rgpd: false,
  });

  useEffect(() => {
    let cancelled = false;
    getVilles().then((data) => { if (!cancelled) setVillesPartenaires(data); }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await creerDemandeCommercant({
        nom_commerce: formData.nomCommerce, categorie: formData.categorie,
        nom_ville: formData.nomVille, departement: formData.departement,
        adresse: formData.adresse, telephone: formData.telephone,
        email: formData.email, avantage: formData.avantage,
        siret: formData.siret,
      });
      setSubmitted(true);
    } catch { setError('Une erreur est survenue. Réessayez ou contactez-nous.'); }
    finally { setLoading(false); }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none transition-all text-base bg-white";

  if (submitted) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 md:p-16 shadow-xl border border-gray-100 max-w-2xl w-full text-center mx-4">
          <div className="w-24 h-24 rounded-full bg-green-100 text-vert flex items-center justify-center mx-auto mb-8"><CheckCircle2 size={48} /></div>
          <h2 className="font-serif text-4xl font-bold text-texte mb-4">Demande envoyée !</h2>
          <p className="text-xl text-gray-600 mb-6">Merci <strong>{formData.nomCommerce}</strong>. Validation sous 48h.</p>
          <Link to="/commercants" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl text-white bg-bleu hover:bg-bleu-clair transition-colors shadow-lg">Retour</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/commercants" className="inline-flex items-center gap-2 text-gray-500 hover:text-bleu font-medium mb-8 transition-colors"><ArrowLeft size={20} /> Retour</Link>
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-bleu p-8 md:p-12 text-white text-center">
            <h1 className="font-serif text-4xl font-bold mb-3">Inscrire mon commerce</h1>
            <p className="text-blue-100 text-lg">Gratuit — quelle que soit votre ville en France.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-10" noValidate>
            <div>
              <h2 className="font-serif text-2xl font-bold text-texte mb-6 flex items-center gap-3"><Store className="text-or" /> Votre établissement</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="nomCommerce" className="block text-sm font-bold text-gray-700 mb-2">Nom du commerce *</label>
                  <input id="nomCommerce" name="nomCommerce" type="text" value={formData.nomCommerce} onChange={handleChange} className={inputClass} required placeholder="Ex : Boulangerie du Marché" />
                </div>
                <div>
                  <label htmlFor="categorie" className="block text-sm font-bold text-gray-700 mb-2">Catégorie *</label>
                  <select id="categorie" name="categorie" value={formData.categorie} onChange={handleChange} className={inputClass} required>
                    <option value="" disabled>Sélectionnez</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <AutocompleteVille id="nomVille" label="Ville" value={formData.nomVille}
                    onChange={(val) => setFormData((p) => ({ ...p, nomVille: val }))}
                    onSelect={(v) => setFormData((p) => ({ ...p, nomVille: v.nom, departement: v.departement || '' }))}
                    villesPartenaires={villesPartenaires} placeholder="Tapez le nom de votre ville..." required />
                </div>
                <div className="md:col-span-2">
                  <AutocompleteAdresse id="adresse" label="Adresse complète" value={formData.adresse}
                    onChange={(val) => setFormData((p) => ({ ...p, adresse: val }))}
                    onSelect={(a) => setFormData((p) => ({ ...p, adresse: a.label }))}
                    placeholder="Commencez à taper votre adresse..." required />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="siret" className="block text-sm font-bold text-gray-700 mb-2">Numéro SIRET *</label>
                  <input id="siret" name="siret" type="text" value={formData.siret} onChange={handleChange} className={inputClass} required
                    placeholder="Ex : 123 456 789 00012" maxLength={17}
                    pattern="[0-9\s]{14,17}" />
                  <p className="text-xs text-gray-400 mt-1">14 chiffres — permet de vérifier que vous êtes bien le propriétaire de l'établissement.</p>
                </div>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div>
              <h2 className="font-serif text-2xl font-bold text-texte mb-6 flex items-center gap-3"><Mail className="text-or" /> Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                  <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={inputClass} required placeholder="contact@moncommerce.fr" /></div>
                <div><label htmlFor="telephone" className="block text-sm font-bold text-gray-700 mb-2">Téléphone *</label>
                  <input id="telephone" name="telephone" type="tel" value={formData.telephone} onChange={handleChange} className={inputClass} required placeholder="04 00 00 00 00" /></div>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div>
              <h2 className="font-serif text-2xl font-bold text-texte mb-6 flex items-center gap-3"><Tag className="text-or" /> Votre offre</h2>
              <label htmlFor="avantage" className="block text-sm font-bold text-gray-700 mb-2">Avantage proposé *</label>
              <textarea id="avantage" name="avantage" value={formData.avantage} onChange={handleChange} rows={3} className={inputClass} required placeholder="Ex : 1 café offert, -10% sur tout..." />
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="rgpd" checked={formData.rgpd} onChange={handleChange} className="mt-1 w-5 h-5 rounded accent-or" required />
                <span className="text-sm font-medium text-gray-700">J'accepte de participer gratuitement au programme et m'engage à appliquer l'avantage décrit. Retrait possible à tout moment.</span>
              </label>
            </div>
            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
            <div className="text-center pt-2">
              <button type="submit" disabled={!formData.rgpd || loading}
                className="w-full md:w-auto px-12 py-5 bg-or hover:bg-or-clair disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl transition-colors shadow-lg">
                {loading ? 'Envoi...' : "Envoyer ma demande"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
