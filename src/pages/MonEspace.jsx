import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Trophy, Target, Users, Star, MapPin, ArrowRight, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { getResidentProfile, createParrainageCode, getRecommendations } from '../lib/api';
import { CarteDigitale } from '../components/index';

export default function MonEspace() {
  const [numero, setNumero] = useState('');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [codeParrainage, setCodeParrainage] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const data = await getResidentProfile(numero.trim().toUpperCase(), email.trim().toLowerCase());
      if (data?.error) { setError('Carte introuvable ou inactive. Vérifiez vos informations.'); return; }
      setProfile(data);
      // Load recommendations
      if (data.carte?.id) {
        getRecommendations(data.carte.id).then(setRecommendations).catch(() => {});
        // Load parrainage code
        if (data.parrainage?.code) setCodeParrainage(data.parrainage.code);
      }
    } catch { setError('Erreur de connexion. Réessayez.'); }
    finally { setLoading(false); }
  }

  async function handleGenererCode() {
    if (!profile?.carte?.id) return;
    try {
      const code = await createParrainageCode(profile.carte.id);
      setCodeParrainage(code);
    } catch { }
  }

  function copyCode() {
    if (!codeParrainage) return;
    navigator.clipboard.writeText(codeParrainage).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); });
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none transition-all text-base";

  // ── Login form ─────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <CreditCard size={40} className="text-bleu mx-auto mb-4" />
            <h1 className="font-serif text-3xl font-bold text-texte mb-2">Mon espace</h1>
            <p className="text-gray-500">Accédez à votre passeport local avec votre numéro de carte.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Numéro de carte</label>
              <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="SAN-123456" required className={inputClass} style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marie@exemple.fr" required className={inputClass} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Chargement...' : 'Accéder à mon espace'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Espace résident ────────────────────────────────────────
  const c = profile.carte;
  const s = profile.stats;
  const badges = profile.badges ?? [];
  const missions = profile.missions ?? [];
  const visites = profile.visites_recentes ?? [];
  const exp = new Date(c.date_expiration);
  const expStr = `${String(exp.getMonth() + 1).padStart(2, '0')}/${exp.getFullYear()}`;
  const isDigital = c.type_carte === 'digitale' || c.type_carte === 'les_deux';

  // Score d'impact (simple calcul)
  const score = (s.total_visites * 10) + (s.commerces_visites * 25) + (badges.length * 50);

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl font-bold text-texte mb-2">Bonjour {c.prenom} !</h1>
          <p className="text-gray-500">Votre passeport local à {c.ville_nom}</p>
        </div>

        {/* Carte */}
        <div className="mb-10">
          <CarteDigitale ville={c.ville_nom} numero={c.numero} expiration={expStr} prenom={c.prenom} nom={c.nom} formule={c.formule} qrToken={isDigital ? c.qr_token : null} />
        </div>

        {/* Score d'impact */}
        <div className="bg-gradient-to-br from-bleu to-[#0d2440] rounded-3xl p-8 text-white text-center mb-8">
          <div className="text-sm uppercase tracking-wider text-blue-200 mb-2">Score d'impact local</div>
          <div className="font-serif text-6xl font-bold text-or-clair mb-4">{score}</div>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div><div className="text-2xl font-bold">{s.total_visites}</div><div className="text-xs text-blue-200">Visites</div></div>
            <div><div className="text-2xl font-bold">{s.commerces_visites}</div><div className="text-xs text-blue-200">Commerces</div></div>
            <div><div className="text-2xl font-bold">{s.mois_actif}</div><div className="text-xs text-blue-200">Mois actifs</div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Badges */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-texte mb-6 flex items-center gap-2"><Trophy size={22} className="text-or" /> Mes badges</h2>
            {badges.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Continuez vos visites pour débloquer des badges !</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {badges.map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                    className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <div className="text-3xl mb-2">{b.icone}</div>
                    <div className="font-bold text-sm text-texte">{b.nom}</div>
                    <div className="text-xs text-gray-500 mt-1">{b.description}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Missions */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-texte mb-6 flex items-center gap-2"><Target size={22} className="text-vert" /> Missions en cours</h2>
            {missions.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Aucune mission active pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {missions.map((m, i) => (
                  <div key={i} className={`rounded-2xl p-4 border ${m.complete ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-texte">{m.titre}</div>
                      {m.complete && <CheckCircle2 size={18} className="text-vert" />}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{m.description}</p>
                    {m.reward_text && <p className="text-xs text-or font-bold">Récompense : {m.reward_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parrainage */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-texte mb-6 flex items-center gap-2"><Share2 size={22} className="text-bleu" /> Parrainage</h2>
            <p className="text-gray-600 text-sm mb-4">Partagez votre code avec vos proches. Chaque filleul inscrit renforce votre impact local !</p>
            {codeParrainage ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-mono text-lg font-bold text-bleu tracking-wider text-center border border-gray-200">{codeParrainage}</div>
                <button onClick={copyCode} className="p-3 bg-bleu text-white rounded-xl hover:bg-bleu-clair transition-colors">
                  {codeCopied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                </button>
              </div>
            ) : (
              <button onClick={handleGenererCode} className="w-full py-3 bg-or hover:bg-or-clair text-white font-bold rounded-xl transition-colors">
                Générer mon code de parrainage
              </button>
            )}
            {profile.parrainage?.filleuls > 0 && (
              <p className="text-sm text-vert font-bold mt-4">{profile.parrainage.filleuls} filleul{profile.parrainage.filleuls > 1 ? 's' : ''} inscrit{profile.parrainage.filleuls > 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Recommandations */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-texte mb-6 flex items-center gap-2"><Star size={22} className="text-or" /> À découvrir</h2>
            {recommendations.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Vous avez visité tous les commerces ! Bravo !</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div>
                      <div className="font-bold text-sm text-texte">{r.nom}</div>
                      <div className="text-xs text-gray-500">{r.categorie} — {r.avantage}</div>
                    </div>
                    <MapPin size={16} className="text-or shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Historique visites */}
        {visites.length > 0 && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mt-8">
            <h2 className="font-serif text-2xl font-bold text-texte mb-6">Dernières visites</h2>
            <div className="space-y-3">
              {visites.map((v, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-bold text-sm text-texte">{v.commerce_nom}</div>
                    <div className="text-xs text-gray-400">{v.categorie}</div>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(v.date).toLocaleDateString('fr-FR')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
          <Link to={`/villes/${c.ville_slug}`} className="px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-center">
            Voir les commerces de {c.ville_nom}
          </Link>
          <Link to="/resilier" className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-center">
            Résilier ma carte
          </Link>
        </div>
      </div>
    </div>
  );
}
