import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Users, Store, MapPin, Euro, Lock, XCircle, Clock, CheckCircle2, Trophy, LogOut } from 'lucide-react';
import { getVilles, getAdminDashboard, getStatsMensuelles, getTopClients, getDemandesEnAttente, signInAdmin, signOutAdmin, adminAction } from '../../lib/api';
import { supabase } from '../../lib/supabase';

const SOURCE_LABELS = { qr: 'QR Code', code_mensuel: 'Code mensuel', carnet: 'Carnet', telephone: 'Téléphone', nfc: 'NFC', admin: 'Admin' };

// ── Login form (Supabase Auth) ───────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await signInAdmin(email, password);
      onLogin();
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4 text-center">
        <Lock size={40} className="text-bleu mx-auto mb-6" />
        <h1 className="font-serif text-3xl font-bold text-texte mb-2">Administration</h1>
        <p className="text-gray-500 mb-8">Connectez-vous avec votre compte admin Supabase.</p>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Demandes commercants ─────────────────────────────────────
function DemandesCommerces({ onValidated }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    let c = false;
    getDemandesEnAttente().then((d) => { if (!c) { setDemandes(d); setLoading(false); } }).catch(() => setLoading(false));
    return () => { c = true; };
  }, []);

  async function handleAction(id, action) {
    setActionId(id);
    try {
      await adminAction(action === 'approve' ? 'approve' : 'refuse', id);
      setDemandes((prev) => prev.filter((d) => d.id !== id));
      if (action === 'approve') onValidated?.();
    } catch (err) { console.error(err); }
    setActionId(null);
  }

  if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded-2xl" />;
  if (demandes.length === 0) return <p className="text-gray-400 text-center py-4">Aucune demande en attente.</p>;

  return (
    <div className="space-y-4">
      {demandes.map((d) => (
        <div key={d.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h4 className="font-bold text-texte text-lg">{d.nom_commerce}</h4>
              <p className="text-sm text-gray-500">{d.categorie} · {d.nom_ville}{d.departement ? ` (${d.departement})` : ''}</p>
              <p className="text-sm text-gray-500">{d.adresse}</p>
              <p className="text-sm text-gray-500">{d.email} · {d.telephone}</p>
              {d.siret && <p className="text-xs text-gray-400 mt-1">SIRET : {d.siret}</p>}
              <p className="text-sm text-or font-medium mt-2">Avantage : {d.avantage_propose}</p>
            </div>
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button onClick={() => handleAction(d.id, 'approve')} disabled={actionId === d.id}
                className="px-4 py-2 bg-vert text-white font-bold rounded-xl text-sm hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-1">
                <CheckCircle2 size={16} /> {actionId === d.id ? '...' : 'Valider'}
              </button>
              <button onClick={() => handleAction(d.id, 'refuse')} disabled={actionId === d.id}
                className="px-4 py-2 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm hover:bg-red-50 hover:text-red-500 transition-colors flex items-center gap-1">
                <XCircle size={16} /> Refuser
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Classement clients (via RPC, no full table scan) ─────────
function ClassementClients({ villeId }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!villeId) return;
    let c = false;
    getTopClients(villeId).then((d) => { if (!c) { setClients(d || []); setLoading(false); } }).catch(() => setLoading(false));
    return () => { c = true; };
  }, [villeId]);

  if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded-2xl" />;
  if (clients.length === 0) return <p className="text-gray-400 text-center py-4">Aucune visite enregistrée.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
          <th className="p-3 w-10">#</th><th className="p-3">Résident</th><th className="p-3">Carte</th><th className="p-3 text-right">Visites</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {clients.map((c, i) => (
            <tr key={c.id} className={`hover:bg-gray-50 ${i < 3 ? 'font-bold' : ''}`}>
              <td className="p-3">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</td>
              <td className="p-3 text-texte">{c.prenom} {c.nom_titulaire}</td>
              <td className="p-3 font-mono text-sm text-gray-500">{c.numero}</td>
              <td className="p-3 text-right font-bold text-bleu">{c.visites}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dashboard content ────────────────────────────────────────
function DashboardContent({ onLogout }) {
  const [villesList, setVillesList] = useState([]);
  const [selectedVille, setSelectedVille] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let c = false;
    getVilles().then((data) => {
      if (!c) {
        const actives = data.filter((v) => v.statut === 'actif');
        setVillesList(actives);
        if (actives.length > 0 && !selectedVille) setSelectedVille(actives[0].slug);
      }
    }).catch(console.error);
    return () => { c = true; };
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedVille) { setLoading(false); return; }
    let c = false;
    setLoading(true);
    Promise.all([
      getAdminDashboard(selectedVille).catch(() => null),
      getVilles().then((v) => { const ville = v.find((x) => x.slug === selectedVille); return ville ? getStatsMensuelles(ville.id) : []; }).catch(() => []),
    ]).then(([dash, s]) => { if (!c) { setDashboard(dash); setStats(s); setLoading(false); } });
    return () => { c = true; };
  }, [selectedVille, refreshKey]);

  const ville = dashboard?.ville;
  const commerces = dashboard?.commerces ?? [];
  const visitesParSource = dashboard?.visites_par_source ?? [];
  const sorted = [...commerces].sort((a, b) => (b.visites ?? 0) - (a.visites ?? 0));

  function exportCSV() {
    const rows = [['Commerce', 'Catégorie', 'Avantage', 'Visites', 'Actif'], ...sorted.map(c => [c.nom, c.categorie, c.avantage, c.visites, c.actif ? 'Oui' : 'Non'])];
    const blob = new Blob(['\ufeff' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `carte-resident-${selectedVille}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  const kpis = [
    { label: 'Cartes actives', value: ville?.cartes_actives ?? 0, icon: <Users size={18} />, color: 'text-bleu' },
    { label: 'Commerces', value: ville?.commerces_partenaires ?? 0, icon: <Store size={18} />, color: 'text-or' },
    { label: 'Visites', value: ville?.visites_total ?? 0, icon: <MapPin size={18} />, color: 'text-vert' },
    { label: 'Revenus', value: `${dashboard?.revenus_cartes ?? 0}€`, icon: <Euro size={18} />, color: 'text-purple-600' },
    { label: 'Résiliées', value: dashboard?.cartes_annulees ?? 0, icon: <XCircle size={18} />, color: 'text-red-500' },
    { label: 'Demandes', value: dashboard?.demandes_en_attente ?? 0, icon: <Clock size={18} />, color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-bleu font-bold uppercase tracking-wider mb-2"><Lock size={14} /> Administration</div>
            <h1 className="font-serif text-4xl font-bold text-texte">Tableau de bord</h1>
          </div>
          <div className="flex items-center gap-3">
            {villesList.length > 0 && (
              <select value={selectedVille} onChange={(e) => setSelectedVille(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:border-or outline-none">
                {villesList.map((v) => <option key={v.slug} value={v.slug}>{v.nom}</option>)}
              </select>
            )}
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-bleu text-white rounded-xl font-medium hover:bg-bleu-clair transition-colors">
              <Download size={18} /> CSV
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-red-50 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {kpis.map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 font-medium text-xs uppercase tracking-wider">{kpi.label}</span>
                    <div className={kpi.color}>{kpi.icon}</div>
                  </div>
                  <div className="font-serif text-2xl font-bold text-texte">
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString('fr-FR') : kpi.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Demandes */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
              <h3 className="font-serif text-xl font-bold text-texte mb-6 flex items-center gap-2">
                <Clock size={20} className="text-orange-500" /> Demandes en attente
              </h3>
              <DemandesCommerces onValidated={() => setRefreshKey((k) => k + 1)} />
            </div>

            {/* Graphique + Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm lg:col-span-2">
                <h3 className="font-serif text-xl font-bold text-texte mb-6">Évolution des visites</h3>
                {stats.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs><linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c8963e" stopOpacity={0.25} /><stop offset="95%" stopColor="#c8963e" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} formatter={(v) => [`${v} visites`, '']} />
                        <Area type="monotone" dataKey="visites" stroke="#c8963e" strokeWidth={3} fillOpacity={1} fill="url(#gV)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="h-64 flex items-center justify-center text-gray-400">Pas encore de données.</div>}
              </div>
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h3 className="font-serif text-xl font-bold text-texte mb-6">Sources</h3>
                {visitesParSource.length > 0 ? (
                  <div className="space-y-4">
                    {visitesParSource.map((v, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">{SOURCE_LABELS[v.source] || v.source}</span>
                        <span className="font-bold text-bleu">{v.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="flex items-center justify-center h-40 text-gray-400">Pas de données.</div>}
              </div>
            </div>

            {/* Classement */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                <Trophy size={20} className="text-or" />
                <h3 className="font-serif text-xl font-bold text-texte">Résidents les plus actifs</h3>
              </div>
              <div className="p-6"><ClassementClients villeId={ville?.id} /></div>
            </div>

            {/* Commerces */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-serif text-xl font-bold text-texte">Visites par commerce</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="p-4">Commerce</th><th className="p-4">Catégorie</th>
                    <th className="p-4 hidden md:table-cell">Avantage</th><th className="p-4 text-center">Statut</th><th className="p-4 text-right">Visites</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {sorted.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucun commerce.</td></tr> :
                    sorted.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-texte">{c.nom}</td>
                        <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">{c.categorie}</span></td>
                        <td className="p-4 text-gray-500 text-sm hidden md:table-cell">{c.avantage}</td>
                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${c.actif ? 'bg-green-100 text-vert' : 'bg-red-100 text-red-500'}`}>{c.actif ? 'Actif' : 'Retiré'}</span></td>
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

// ── Export principal ──────────────────────────────────────────
export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setChecking(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription?.unsubscribe();
  }, []);

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-creme"><div className="w-10 h-10 border-4 border-or border-t-transparent rounded-full animate-spin" /></div>;
  if (!session) return <AdminLogin onLogin={() => supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s))} />;

  return <DashboardContent onLogout={async () => { await signOutAdmin(); setSession(null); }} />;
}
