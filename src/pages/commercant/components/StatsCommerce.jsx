// src/pages/commercant/components/StatsCommerce.jsx
// KPIs + graphiques pour le commerçant
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Eye, Star, Tag } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const JOURS_SEMAINE = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function StatsCommerce({ commerceId }) {
  const [stats, setStats] = useState(null);
  const [visitesParJour, setVisitesParJour] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!commerceId) return;
    async function charger() {
      try {
        const now = new Date();
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const debutMoisDernier = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const finMoisDernier = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
        const il30j = new Date(now - 30 * 86400000).toISOString();

        const [visitesRes, visitesMoisRes, visitesMois1Res, offresRes, avisRes] = await Promise.all([
          supabase.from('visites').select('date_visite').eq('commerce_id', commerceId).gte('date_visite', il30j),
          supabase.from('visites').select('id', { count: 'exact', head: true }).eq('commerce_id', commerceId).gte('date_visite', debutMois),
          supabase.from('visites').select('id', { count: 'exact', head: true }).eq('commerce_id', commerceId).gte('date_visite', debutMoisDernier).lte('date_visite', finMoisDernier),
          supabase.from('offres').select('id', { count: 'exact', head: true }).eq('commerce_id', commerceId).eq('active', true),
          supabase.from('avis').select('note').eq('commerce_id', commerceId).eq('publie', true),
        ]);

        const moisActuel = visitesRes.count ?? 0;
        const moisDernier = visitesMois1Res.count ?? 0;
        const evolution = moisDernier > 0 ? Math.round(((moisActuel - moisDernier) / moisDernier) * 100) : 0;
        const notes = (avisRes.data ?? []).map((a) => a.note);
        const noteMoy = notes.length > 0 ? (notes.reduce((s, n) => s + n, 0) / notes.length).toFixed(1) : '—';

        setStats({
          visitesMois: visitesRes.count ?? 0,
          evolution,
          offresActives: offresRes.count ?? 0,
          noteMoyenne: noteMoy,
          nbAvis: notes.length,
        });

        // Visites par jour de la semaine
        const jourCounts = [0, 0, 0, 0, 0, 0, 0];
        (visitesRes.data ?? []).forEach((v) => {
          const d = new Date(v.date_visite).getDay();
          jourCounts[d]++;
        });
        setVisitesParJour(JOURS_SEMAINE.map((label, i) => ({ jour: label, visites: jourCounts[i] })));
      } catch (err) {
        console.error('Erreur StatsCommerce:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [commerceId]);

  if (isLoading) return <div className="text-center py-8"><div className="w-6 h-6 border-4 border-gray-200 border-t-bleu rounded-full animate-spin mx-auto" /></div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Eye size={18} className="text-bleu mb-2" />
          <div className="text-2xl font-bold text-texte">{stats.visitesMois}</div>
          <div className="text-xs text-gray-500">Visites ce mois</div>
          <div className={`flex items-center gap-1 text-xs mt-1 ${stats.evolution >= 0 ? 'text-vert' : 'text-red-500'}`}>
            {stats.evolution >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {stats.evolution > 0 ? '+' : ''}{stats.evolution}% vs mois dernier
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Tag size={18} className="text-or mb-2" />
          <div className="text-2xl font-bold text-texte">{stats.offresActives}</div>
          <div className="text-xs text-gray-500">Offres actives</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Star size={18} className="text-or mb-2" />
          <div className="text-2xl font-bold text-texte">{stats.noteMoyenne}</div>
          <div className="text-xs text-gray-500">{stats.nbAvis} avis</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Users size={18} className="text-vert mb-2" />
          <div className="text-2xl font-bold text-texte">{stats.visitesMois}</div>
          <div className="text-xs text-gray-500">Résidents ce mois</div>
        </div>
      </div>

      {/* Graphique visites par jour de la semaine */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-sm text-texte mb-4">Visites par jour de la semaine (30 derniers jours)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={visitesParJour}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="visites" fill="#1a3a5c" radius={[4, 4, 0, 0]} name="Visites" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
