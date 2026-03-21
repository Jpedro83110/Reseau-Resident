import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Store, Users, TrendingUp, Calendar, Tag, ArrowLeft, LogOut } from 'lucide-react';
import { getCommerceStats } from '../lib/api';

export default function MonCommerce() {
  const [searchParams] = useSearchParams();
  const paramId = searchParams.get('id');
  const paramToken = searchParams.get('token');

  const [commerceId, setCommerceId] = useState(paramId || '');
  const [token, setToken] = useState(paramToken || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoLoaded, setAutoLoaded] = useState(false);

  // Auto-load if params in URL
  if (paramId && paramToken && !autoLoaded && !data) {
    setAutoLoaded(true);
    setLoading(true);
    getCommerceStats(paramId, paramToken)
      .then((d) => { if (d?.error) setError('Commerce introuvable.'); else setData(d); })
      .catch(() => setError('Erreur.'))
      .finally(() => setLoading(false));
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const d = await getCommerceStats(commerceId, token);
      if (d?.error) { setError('Commerce introuvable ou token invalide.'); return; }
      setData(d);
    } catch { setError('Erreur.'); }
    finally { setLoading(false); }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none transition-all text-base";

  if (!data) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <Store size={40} className="text-or mx-auto mb-4" />
            <h1 className="font-serif text-3xl font-bold text-texte mb-2">Espace commerçant</h1>
            <p className="text-gray-500">Accédez à vos statistiques avec votre identifiant et token reçus par email.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ID Commerce</label>
              <input type="text" value={commerceId} onChange={(e) => setCommerceId(e.target.value)} required className={inputClass} placeholder="uuid..." />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Token d'accès</label>
              <input type="text" value={token} onChange={(e) => setToken(e.target.value)} required className={inputClass} placeholder="token..." />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3 bg-or hover:bg-or-clair text-white font-bold rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Chargement...' : 'Accéder'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const co = data.commerce;
  const visitsMois = data.visites_par_mois ?? [];

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/commercants" className="inline-flex items-center gap-2 text-gray-500 hover:text-bleu font-medium mb-8 transition-colors">
          <ArrowLeft size={20} /> Retour
        </Link>

        {/* Header */}
        <div className="bg-gradient-to-br from-or to-or-clair rounded-3xl p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Store size={28} />
            <h1 className="font-serif text-3xl font-bold">{co.nom}</h1>
          </div>
          <p className="text-orange-100">{co.categorie} — {co.adresse}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
            <Tag size={14} /> {co.avantage}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Visites totales', value: co.visites_total, icon: <TrendingUp size={18} />, color: 'text-bleu' },
            { label: '30 derniers jours', value: data.visites_30j, icon: <Calendar size={18} />, color: 'text-or' },
            { label: '7 derniers jours', value: data.visites_7j, icon: <Calendar size={18} />, color: 'text-vert' },
            { label: 'Clients uniques', value: data.clients_uniques, icon: <Users size={18} />, color: 'text-purple-600' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs uppercase tracking-wider">{kpi.label}</span>
                <div className={kpi.color}>{kpi.icon}</div>
              </div>
              <div className="font-serif text-3xl font-bold text-texte">{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Graphique */}
        {visitsMois.length > 0 && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
            <h2 className="font-serif text-xl font-bold text-texte mb-6">Visites par mois</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitsMois} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c8963e" stopOpacity={0.25} /><stop offset="95%" stopColor="#c8963e" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(v) => [`${v} visites`, '']} />
                  <Area type="monotone" dataKey="count" stroke="#c8963e" strokeWidth={3} fillOpacity={1} fill="url(#gC)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Offres actives */}
        {data.offres_actives?.length > 0 && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
            <h2 className="font-serif text-xl font-bold text-texte mb-6">Offres actives</h2>
            <div className="space-y-3">
              {data.offres_actives.map((o, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div><div className="font-bold text-texte">{o.titre}</div><div className="text-xs text-gray-500 capitalize">{o.type}</div></div>
                  {o.date_fin && <div className="text-sm text-gray-400">Jusqu'au {new Date(o.date_fin).toLocaleDateString('fr-FR')}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center">
          <Link to={`/retirer-commerce?id=${co.id}&token=${token}`}
            className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors text-sm">
            Quitter le réseau Carte Résident
          </Link>
        </div>
      </div>
    </div>
  );
}
