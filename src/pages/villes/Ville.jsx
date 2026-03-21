import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Store, Users, Mail } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CommercantCard } from '../../components/index.jsx';
import { useVille, useStatsMensuelles } from '../../hooks/useData';
import { inscrireListeAttente } from '../../lib/api';
import { useState } from 'react';

// ── Page ville introuvable ────────────────────────────────────
function VilleIntrouvable() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-creme px-4">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-texte mb-4">Ville introuvable</h1>
        <p className="text-gray-600 mb-8">Cette ville n'est pas encore dans notre réseau.</p>
        <Link to="/" className="px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

// ── Page ville "bientôt" ──────────────────────────────────────
function VilleBientot({ ville }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await inscrireListeAttente(email, ville.slug);
      setSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-200 text-gray-500 mb-8">
          <MapPin size={40} aria-hidden="true" />
        </div>
        <h1 className="font-serif text-5xl md:text-6xl font-bold text-texte mb-6">{ville.nom}</h1>
        <p className="text-2xl text-gray-600 mb-12 font-serif italic">{ville.description}</p>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 max-w-xl mx-auto">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="font-serif text-2xl font-bold text-texte mb-2">C'est noté !</h2>
              <p className="text-gray-600">Nous vous préviendrons dès le lancement à {ville.nom}.</p>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-2xl font-bold text-texte mb-4">Soyez le premier informé</h2>
              <p className="text-gray-600 mb-8">Laissez votre email pour être prévenu dès le lancement de la Carte Résident à {ville.nom}.</p>
              <form className="flex flex-col sm:flex-row gap-4" onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Votre adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-or focus:ring-4 focus:ring-or/20 outline-none transition-all"
                  required
                  aria-label="Adresse email"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-bleu hover:bg-bleu-clair disabled:opacity-60 text-white font-bold rounded-xl transition-colors whitespace-nowrap"
                >
                  {loading ? 'Envoi...' : "M'avertir"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ville active ─────────────────────────────────────────
function VilleActive({ ville }) {
  const { data: statsMensuelles } = useStatsMensuelles(ville.id);
  const progress = Math.min(((ville.cartes_actives ?? 0) / 500) * 100, 100);
  const commerces = (ville.commerces ?? []).filter(c => c.actif);
  const [filtre, setFiltre] = useState('tous');

  // Extraire les catégories uniques
  const categories = [...new Set(commerces.map(c => c.categorie))].sort();
  const commercesFiltres = filtre === 'tous' ? commerces : commerces.filter(c => c.categorie === filtre);

  return (
    <div className="min-h-screen bg-creme">
      {/* Hero */}
      <section className="relative pt-32 pb-24 bg-gradient-to-br from-bleu to-[#0d2440] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_top_right,_#c8963e_0%,_transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-sm font-bold text-green-300 uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Ville active
              </div>
              <h1 className="font-serif text-5xl md:text-7xl font-bold mb-2">{ville.nom}</h1>
              <p className="text-xl text-blue-200 font-serif italic">{ville.departement}</p>
            </div>
            <Link
              to={`/inscription?ville=${ville.slug}`}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl text-white bg-or hover:bg-or-clair transition-colors shadow-lg whitespace-nowrap"
            >
              Obtenir ma carte {ville.nom}
            </Link>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Users size={22} aria-hidden="true" />, label: 'Résidents équipés', value: ville.cartes_actives ?? 0 },
              { icon: <Store size={22} aria-hidden="true" />, label: 'Commerces partenaires', value: ville.commerces_partenaires ?? 0 },
              { icon: <MapPin size={22} aria-hidden="true" />, label: 'Visites générées', value: ville.visites_total ?? 0 },
            ].map((kpi, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-2 text-or-clair">
                  {kpi.icon}
                  <span className="text-sm uppercase tracking-wider text-blue-200 font-semibold">{kpi.label}</span>
                </div>
                <div className="text-4xl font-bold font-serif">{kpi.value.toLocaleString('fr-FR')}</div>
              </div>
            ))}
          </div>

          {/* Barre de progression */}
          <div className="mt-10 bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex justify-between text-sm font-medium mb-3">
              <span className="text-blue-200">Objectif : 500 cartes</span>
              <span className="text-or-clair">{Math.round(progress)}% atteint</span>
            </div>
            <div className="h-4 bg-black/20 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-or to-or-clair rounded-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Commerces */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <h2 className="font-serif text-4xl font-bold text-texte mb-3">Les commerces partenaires</h2>
              <p className="text-lg text-gray-600">Découvrez les avantages qui vous attendent à {ville.nom}.</p>
            </div>
            {categories.length > 1 && (
              <select value={filtre} onChange={(e) => setFiltre(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-medium text-sm focus:border-or outline-none"
                aria-label="Filtrer par catégorie">
                <option value="tous">Toutes les catégories</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            )}
          </div>

          {commercesFiltres.length === 0 ? (
            <p className="text-gray-500 text-center py-16">Aucun commerce partenaire{filtre !== 'tous' ? ' dans cette catégorie' : ''} pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {commercesFiltres.map((commerce) => (
                <CommercantCard key={commerce.id} commerce={commerce} />
              ))}
            </div>
          )}}

          {/* Graphique */}
          {statsMensuelles && statsMensuelles.length > 0 && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-16">
              <h3 className="font-serif text-2xl font-bold text-texte mb-8">Dynamique locale</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={statsMensuelles} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} dx={-10} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontWeight: 600 }}
                      itemStyle={{ color: '#1a3a5c' }}
                      formatter={(v) => [`${v} visites`, '']}
                    />
                    <Line
                      type="monotone"
                      dataKey="visites"
                      stroke="#c8963e"
                      strokeWidth={4}
                      dot={{ r: 6, fill: '#c8963e', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: '#1a3a5c' }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4 italic">Évolution des visites générées par la Carte Résident</p>
            </div>
          )}

          {/* CTA commerce */}
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-3xl p-8 md:p-12 border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="font-serif text-3xl font-bold text-texte mb-4">Votre commerce n'est pas encore partenaire ?</h3>
              <p className="text-lg text-gray-600 max-w-xl">Rejoignez gratuitement le réseau Carte Résident à {ville.nom} et attirez une nouvelle clientèle locale.</p>
            </div>
            <Link
              to={`/commercants/rejoindre?ville=${ville.slug}`}
              className="px-8 py-4 bg-white text-bleu border-2 border-bleu hover:bg-bleu hover:text-white font-bold rounded-xl transition-colors whitespace-nowrap"
            >
              Inscrire mon commerce
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Export principal ──────────────────────────────────────────
export default function Ville() {
  const { slug } = useParams();
  const { data: ville, loading, error } = useVille(slug);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme">
        <div className="w-10 h-10 border-4 border-or border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ville) return <VilleIntrouvable />;
  if (ville.statut !== 'actif') return <VilleBientot ville={ville} />;
  return <VilleActive ville={ville} />;
}
