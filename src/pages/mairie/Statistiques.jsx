// src/pages/mairie/Statistiques.jsx
import { useState, useEffect } from 'react';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

const COLORS = ['#1a3a5c', '#2a5298', '#c8963e', '#e8b86d', '#2d7a4f', '#6b7280'];
const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function Statistiques() {
  const { user } = useAuth();
  usePageMeta('Mairie — Statistiques');

  const [villeId, setVilleId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inscriptions, setInscriptions] = useState([]);
  const [visites, setVisites] = useState([]);
  const [topCommerces, setTopCommerces] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    async function charger() {
      try {
        const { data: profil } = await supabase.from('mairie_profiles').select('ville_id').eq('id', user.id).maybeSingle();
        if (!profil) { setIsLoading(false); return; }
        setVilleId(profil.ville_id);

        // Inscriptions par mois (6 derniers mois via profiles)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const { data: profilesData } = await supabase.from('profiles').select('created_at').eq('ville_id', profil.ville_id).gte('created_at', sixMonthsAgo.toISOString());
        const monthCounts = {};
        (profilesData ?? []).forEach((p) => {
          const d = new Date(p.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthCounts[key] = (monthCounts[key] || 0) + 1;
        });
        const inscData = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          inscData.push({ mois: MOIS[d.getMonth()], count: monthCounts[key] || 0 });
        }
        setInscriptions(inscData);

        // Visites par mois (RPC existante)
        const { data: visitesData } = await supabase.rpc('get_stats_mensuelles', { p_ville_id: profil.ville_id });
        setVisites((visitesData ?? []).map((v) => ({ mois: v.mois, count: Number(v.visites) })));

        // Top 5 commerces
        const { data: comData } = await supabase.from('commerces').select('nom, visites').eq('ville_id', profil.ville_id).eq('actif', true).order('visites', { ascending: false }).limit(5);
        setTopCommerces(comData ?? []);

        // Catégories
        const { data: catData } = await supabase.from('commerces').select('categorie').eq('ville_id', profil.ville_id).eq('actif', true);
        const catCounts = {};
        (catData ?? []).forEach((c) => { catCounts[c.categorie] = (catCounts[c.categorie] || 0) + 1; });
        setCategories(Object.entries(catCounts).map(([name, value]) => ({ name, value })));
      } catch (err) {
        console.error('Erreur Statistiques:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user]);

  if (isLoading) return <div className="min-h-screen pt-28 bg-creme flex items-center justify-center"><div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex gap-8">
          <MairieNav />
          <main className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-bold text-texte mb-6">Statistiques</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inscriptions résidents */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-sm text-texte mb-4">Inscriptions résidents (6 mois)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={inscriptions}>
                    <defs>
                      <linearGradient id="gradInsc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a3a5c" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1a3a5c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#1a3a5c" fill="url(#gradInsc)" name="Inscriptions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Visites par mois */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-sm text-texte mb-4">Visites commerces (6 mois)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={visites}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2a5298" radius={[4, 4, 0, 0]} name="Visites" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top 5 commerces */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-sm text-texte mb-4">Top 5 commerces les plus visités</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topCommerces} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="nom" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="visites" fill="#c8963e" radius={[0, 4, 4, 0]} name="Visites" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Répartition catégories */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-sm text-texte mb-4">Catégories de commerces</h3>
                {categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                        {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-8 text-gray-400 text-sm">Pas encore de données</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {categories.map((c, i) => (
                    <span key={c.name} className="text-[10px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {c.name} ({c.value})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
