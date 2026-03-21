import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download, Users, Store, MapPin, Euro, Lock, XCircle, Clock } from 'lucide-react';
import { getVilles, getAdminDashboard, getStatsMensuelles } from '../../lib/api';

const PIE_COLORS = ['#1a3a5c', '#c8963e', '#2d7a4f', '#6b7280', '#7c3aed'];
const SOURCE_LABELS = { qr: 'QR Code', code_mensuel: 'Code mensuel', carnet: 'Carnet', telephone: 'Téléphone', nfc: 'NFC', admin: 'Admin' };

function exportCSV(villeSlug, stats, commerces) {
  try {
    const rows = [
      ['Mois', 'Visites'],
      ...(stats ?? []).map((s) => [s.mois, s.visites]),
      [],
      ['Commerce', 'Catégorie', 'Avantage', 'Visites', 'Actif'],
      ...(commerces ?? []).map((c) => [c.nom, c.categorie, c.avantage, c.visites, c.actif ? 'Oui' : 'Non']),
    ];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carte-resident-${villeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) { console.error('Export error:', err); }
}

export default function Dashboard() {
  const [villesList, setVillesList] = useState([]);
  const [selectedVille, setSelectedVille] = useState('sanary');
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load villes
  useEffect(() => {
    let cancelled = false;
    getVilles().then((data) => {
      if (!cancelled) {
        const actives = data.filter((v) => v.statut === 'actif');
        setVillesList(actives);
        if (actives.length > 0 && !actives.find((v) => v.slug === selectedVille)) {
          setSelectedVille(actives[0].slug);
        }
      }
    }).catch(console.error);
    return () => { cancelled = true; };
  }, []);

  // Load dashboard data when ville changes
  useEffect(() => {
    if (!selectedVille) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getAdminDashboard(selectedVille).catch(() => null),
      // Get ville ID for stats
      getVilles().then((villes) => {
        const v = villes.find((x) => x.slug === selectedVille);
        return v ? getStatsMensuelles(v.id) : [];
      }).catch(() => []),
    ]).then(([dash, statsData]) => {
      if (!cancelled) {
        setDashboard(dash);
        setStats(statsData);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [selectedVille]);

  const ville = dashboard?.ville;
  const commerces = dashboard?.commerces ?? [];
  const visitesParSource = dashboard?.visites_par_source ?? [];
  const sortedCommerces = [...commerces].sort((a, b) => (b.visites ?? 0) - (a.visites ?? 0));

  const kpis = [
    { label: 'Cartes actives', value: ville?.cartes_actives ?? 0, icon: <Users size={20} />, color: 'text-bleu' },
    { label: 'Commerces', value: ville?.commerces_partenaires ?? 0, icon: <Store size={20} />, color: 'text-or' },
    { label: 'Visites totales', value: ville?.visites_total ?? 0, icon: <MapPin size={20} />, color: 'text-vert' },
    { label: 'Revenus cartes', value: `${(dashboard?.revenus_cartes ?? 0).toLocaleString('fr-FR')}€`, icon: <Euro size={20} />, color: 'text-purple-600' },
    { label: 'Cartes résiliées', value: dashboard?.cartes_annulees ?? 0, icon: <XCircle size={20} />, color: 'text-red-500' },
    { label: 'Demandes en attente', value: dashboard?.demandes_en_attente ?? 0, icon: <Clock size={20} />, color: 'text-orange-500' },
  ];

  const pieData = Object.entries(
    commerces.reduce((acc, c) => {
      const cat = c.categorie?.split('/')[0]?.trim() || 'Autre';
      acc[cat] = (acc[cat] || 0) + (c.visites || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-sm text-bleu font-bold uppercase tracking-wider mb-2">
              <Lock size={14} /> Accès administrateur
            </div>
            <h1 className="font-serif text-4xl font-bold text-texte">Tableau de bord</h1>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedVille} onChange={(e) => setSelectedVille(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:border-or outline-none">
              {villesList.map((v) => <option key={v.slug} value={v.slug}>{v.nom}</option>)}
            </select>
            <button onClick={() => exportCSV(selectedVille, stats, commerces)}
              className="flex items-center gap-2 px-4 py-2.5 bg-bleu text-white rounded-xl font-medium hover:bg-bleu-clair transition-colors">
              <Download size={18} /> CSV
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-bleu flex items-start gap-3">
          <Lock size={16} className="shrink-0 mt-0.5" />
          <p><strong>Données anonymisées</strong> — aucune identité n'est associée aux visites.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {kpis.map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 font-medium text-xs uppercase tracking-wider">{kpi.label}</span>
                    <div className={`p-1.5 rounded-lg bg-gray-50 ${kpi.color}`}>{kpi.icon}</div>
                  </div>
                  <div className="font-serif text-2xl font-bold text-texte">
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm lg:col-span-2">
                <h3 className="font-serif text-xl font-bold text-texte mb-6">Évolution des visites</h3>
                {stats.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c8963e" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#c8963e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                          formatter={(v) => [`${v} visites`, '']} />
                        <Area type="monotone" dataKey="visites" stroke="#c8963e" strokeWidth={3} fillOpacity={1} fill="url(#gV)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="h-72 flex items-center justify-center text-gray-400">Pas encore de données.</div>}
              </div>

              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h3 className="font-serif text-xl font-bold text-texte mb-6">Sources des visites</h3>
                {visitesParSource.length > 0 ? (
                  <div className="space-y-4">
                    {visitesParSource.map((v, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{SOURCE_LABELS[v.source] || v.source}</span>
                        <span className="font-bold text-bleu">{v.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="h-40 flex items-center justify-center text-gray-400">Pas encore de données.</div>}
              </div>
            </div>

            {/* Tableau commerces */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-serif text-xl font-bold text-texte">Commerces — visites par commerce</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Commerce</th>
                      <th className="p-4 font-semibold">Catégorie</th>
                      <th className="p-4 font-semibold hidden md:table-cell">Avantage</th>
                      <th className="p-4 font-semibold text-center">Statut</th>
                      <th className="p-4 font-semibold text-right">Visites</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedCommerces.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucun commerce.</td></tr>
                    ) : sortedCommerces.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-texte">{c.nom}</td>
                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">{c.categorie}</span></td>
                        <td className="p-4 text-gray-500 text-sm hidden md:table-cell">{c.avantage}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${c.actif ? 'bg-green-100 text-vert' : 'bg-red-100 text-red-500'}`}>
                            {c.actif ? 'Actif' : 'Retiré'}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold text-bleu">{(c.visites ?? 0).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
