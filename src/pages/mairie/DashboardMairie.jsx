// src/pages/mairie/DashboardMairie.jsx
// Dashboard territorial mairie avec KPIs, graphiques, projets et actualités récents.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Store, Building2, Calendar, Tag, FolderOpen,
  MapPin, ArrowRight, Newspaper, Palette, Upload, Save, Loader2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import ProjetCard from '../association/components/ProjetCard';
import ActualiteCard from '../../components/ActualiteCard';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

// ── Noms de mois FR ──────────────────────────────────────────
const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ── Branding Ville ──────────────────────────────────────────
function BrandingVille({ ville, onUpdated }) {
  const [logo, setLogo] = useState(ville?.logo_url || '');
  const [cp, setCp] = useState(ville?.couleur_primaire || '#1a3a5c');
  const [cs, setCs] = useState(ville?.couleur_secondaire || '#c8963e');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) { setMsg('Le logo ne doit pas dépasser 2 Mo.'); return; }

    // Essayer Supabase Storage d'abord, sinon fallback base64
    const ext = file.name.split('.').pop();
    const path = `logos/${ville.id}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('villes-logos').upload(path, file, { upsert: true });

    if (!uploadErr) {
      const { data } = supabase.storage.from('villes-logos').getPublicUrl(path);
      setLogo(data?.publicUrl || '');
    } else {
      // Fallback : convertir en base64 et stocker directement
      const reader = new FileReader();
      reader.onload = () => setLogo(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from('villes').update({
      logo_url: logo || null,
      couleur_primaire: cp,
      couleur_secondaire: cs,
    }).eq('id', ville.id);
    setSaving(false);
    if (error) { setMsg('Erreur : ' + error.message); }
    else { setMsg('Branding enregistré.'); onUpdated?.(); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-texte mb-5 flex items-center gap-2">
        <Palette size={16} className="text-or" /> Branding de la ville
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Logo</label>
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-lg border border-gray-200" />}
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:border-bleu transition-colors text-xs text-gray-500">
              <Upload size={14} /> Changer
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Couleur primaire</label>
          <div className="flex items-center gap-2">
            <input type="color" value={cp} onChange={(e) => setCp(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
            <input type="text" value={cp} onChange={(e) => setCp(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Couleur secondaire</label>
          <div className="flex items-center gap-2">
            <input type="color" value={cs} onChange={(e) => setCs(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
            <input type="text" value={cs} onChange={(e) => setCs(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono" />
          </div>
        </div>
      </div>
      {/* Apercu */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg" style={{ background: cp }}>
        {logo && <img src={logo} alt="" className="w-8 h-8 object-contain rounded" />}
        <span className="font-bold text-white text-sm">{ville.nom}</span>
        <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold" style={{ background: cs, color: 'white' }}>Aperçu</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-bleu text-white font-bold rounded-lg text-sm hover:bg-bleu-clair transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
        </button>
        {msg && <span className={`text-sm ${msg.startsWith('Erreur') ? 'text-red-500' : 'text-vert'}`}>{msg}</span>}
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, couleur = 'bleu' }) {
  const styles = {
    bleu: 'bg-bleu/10 text-bleu',
    or:   'bg-or/10 text-or',
    vert: 'bg-vert/10 text-vert',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${styles[couleur]}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-texte">{value ?? '—'}</p>
    </div>
  );
}

// ── Utilitaires graphiques ───────────────────────────────────
function buildEmptyMonths(n) {
  const map = {};
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = { mois: MOIS_LABELS[d.getMonth()], count: 0 };
  }
  return map;
}

// ── Dashboard ────────────────────────────────────────────────
export default function DashboardMairie() {
  const { user } = useAuth();
  usePageMeta('Mairie \u2014 Vue d\'ensemble');

  const [ville, setVille] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [inscriptionsData, setInscriptionsData] = useState([]);
  const [visitesData, setVisitesData] = useState([]);
  const [projetsRecents, setProjetsRecents] = useState([]);
  const [actualitesRecentes, setActualitesRecentes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    async function charger() {
      try {
        setIsLoading(true);

        // 1. Profil mairie → ville_id (avec fallback admin → première ville active)
        let villeId = null;
        const { data: profil } = await supabase
          .from('mairie_profiles')
          .select('ville_id, role, service')
          .eq('id', user.id)
          .maybeSingle();

        if (profil?.ville_id) {
          villeId = profil.ville_id;
        } else {
          // Fallback admin : prendre la première ville active
          const { data: premiereVille } = await supabase
            .from('villes')
            .select('id')
            .eq('statut', 'actif')
            .limit(1)
            .maybeSingle();
          if (premiereVille) {
            villeId = premiereVille.id;
          } else {
            setError('Aucune ville active trouvée.');
            return;
          }
        }

        // 2. Données ville
        const { data: villeData, error: villeError } = await supabase
          .from('villes')
          .select('id, nom, slug, statut, logo_url, couleur_primaire, couleur_secondaire')
          .eq('id', villeId)
          .maybeSingle();
        if (villeError) throw villeError;
        if (!villeData) { setError('Ville introuvable.'); return; }
        setVille(villeData);

        // 3. KPIs via RPC (fallback queries directes)
        let kpisData;
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats', { p_ville_id: villeId });
          if (rpcError) throw rpcError;
          kpisData = rpcData;
        } catch {
          // Fallback : queries parallèles
          const [resR, comR, assR, evtR, ofrR, prjR] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('ville_id', villeId),
            supabase.from('commerces').select('id', { count: 'exact', head: true }).eq('ville_id', villeId).eq('actif', true),
            supabase.from('associations').select('id', { count: 'exact', head: true }).eq('ville_id', villeId).eq('actif', true),
            supabase.from('evenements').select('id', { count: 'exact', head: true }).eq('ville_id', villeId).eq('statut', 'publie'),
            supabase.from('offres').select('id', { count: 'exact', head: true })
              .in('commerce_id', ((await supabase.from('commerces').select('id').eq('ville_id', villeId).eq('actif', true)).data ?? []).map(c => c.id))
              .eq('active', true),
            supabase.from('projets').select('id', { count: 'exact', head: true }).eq('ville_id', villeId).eq('statut', 'actif'),
          ]);
          kpisData = {
            residents_count: resR.count ?? 0,
            commerces_count: comR.count ?? 0,
            associations_count: assR.count ?? 0,
            evenements_count: evtR.count ?? 0,
            offres_actives_count: ofrR.count ?? 0,
            projets_actifs_count: prjR.count ?? 0,
          };
        }
        setKpis(kpisData);

        // 4. Données parallèles : graphiques + récents
        const sixMoisAgo = new Date();
        sixMoisAgo.setMonth(sixMoisAgo.getMonth() - 6);

        const [inscRes, visitesRes, projetsRes, actusRes] = await Promise.all([
          // Inscriptions résidents (6 mois)
          supabase
            .from('profiles')
            .select('created_at')
            .eq('ville_id', villeId)
            .gte('created_at', sixMoisAgo.toISOString()),

          // Visites via RPC ou direct
          supabase.rpc('get_stats_mensuelles', { p_ville_id: villeId }).then(
            (res) => res,
            () => ({ data: null }),
          ),

          // 3 projets récents
          supabase
            .from('projets')
            .select('id, titre, description, objectif_montant, montant_collecte, statut, image_url, date_limite, created_at, associations(nom)')
            .eq('ville_id', villeId)
            .in('statut', ['actif', 'atteint'])
            .order('created_at', { ascending: false })
            .limit(3),

          // 3 actualités récentes
          supabase
            .from('actualites')
            .select('id, titre, contenu, auteur_type, categorie, image_url, epingle, created_at')
            .eq('ville_id', villeId)
            .eq('publie', true)
            .order('created_at', { ascending: false })
            .limit(3),
        ]);

        // Agrégation inscriptions par mois
        const inscMap = buildEmptyMonths(6);
        (inscRes.data ?? []).forEach(({ created_at }) => {
          const d = new Date(created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (inscMap[key]) inscMap[key].count += 1;
        });
        setInscriptionsData(Object.values(inscMap));

        // Visites par mois
        if (visitesRes.data && Array.isArray(visitesRes.data)) {
          setVisitesData(visitesRes.data.map((row) => ({
            mois: MOIS_LABELS[new Date(row.mois ?? row.month).getMonth()] ?? row.mois,
            count: row.total ?? row.visites ?? 0,
          })));
        } else {
          // Fallback : requête directe sur visites
          const comIds = ((await supabase.from('commerces').select('id').eq('ville_id', villeId).eq('actif', true)).data ?? []).map(c => c.id);
          if (comIds.length > 0) {
            const { data: vData } = await supabase
              .from('visites')
              .select('date_visite')
              .in('commerce_id', comIds)
              .gte('date_visite', sixMoisAgo.toISOString());
            const vMap = buildEmptyMonths(6);
            (vData ?? []).forEach(({ date_visite }) => {
              const d = new Date(date_visite);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              if (vMap[key]) vMap[key].count += 1;
            });
            setVisitesData(Object.values(vMap));
          }
        }

        setProjetsRecents(projetsRes.data ?? []);
        setActualitesRecentes(actusRes.data ?? []);
      } catch (err) {
        setError('Erreur lors du chargement du dashboard mairie.');
        console.error('Erreur DashboardMairie:', err);
      } finally {
        setIsLoading(false);
      }
    }

    charger();
  }, [user]);

  // ── Chargement ──
  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Chargement du dashboard mairie…</p>
        </div>
      </div>
    );
  }

  // ── Erreur ──
  if (error) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-4">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-sm">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-24 lg:pb-12 bg-creme">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-texte mb-1">
            {ville.nom}
          </h1>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            <MapPin size={14} />
            Dashboard territorial · Réseaux-Résident
          </p>
        </motion.div>

        {/* Layout sidebar + contenu */}
        <div className="flex gap-8">
          <MairieNav />

          <main className="flex-1 min-w-0 space-y-8">

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard icon={Users}      label="Résidents inscrits"     value={kpis?.residents_count}      couleur="bleu" />
              <KpiCard icon={Store}      label="Commerces activés"      value={kpis?.commerces_count}      couleur="or" />
              <KpiCard icon={Building2}  label="Associations présentes" value={kpis?.associations_count}   couleur="vert" />
              <KpiCard icon={Calendar}   label="Événements publiés"     value={kpis?.evenements_count}     couleur="bleu" />
              <KpiCard icon={Tag}        label="Offres actives"         value={kpis?.offres_actives_count} couleur="or" />
              <KpiCard icon={FolderOpen} label="Projets en cours"       value={kpis?.projets_actifs_count} couleur="vert" />
            </div>

            {/* ── Branding ── */}
            <BrandingVille ville={ville} />

            {/* ── Graphiques ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inscriptions résidents */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-texte mb-5 flex items-center gap-2">
                  <Users size={16} className="text-bleu" />
                  Inscriptions résidents (6 mois)
                </h3>
                {inscriptionsData.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inscriptionsData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                          formatter={(v) => [v, 'Inscriptions']}
                        />
                        <Bar dataKey="count" fill="#1a3a5c" radius={[4, 4, 0, 0]} name="Inscriptions" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Pas de données disponibles.</p>
                )}
              </div>

              {/* Visites commerces */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-texte mb-5 flex items-center gap-2">
                  <Store size={16} className="text-or" />
                  Visites commerces (6 mois)
                </h3>
                {visitesData.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={visitesData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                          formatter={(v) => [v, 'Visites']}
                        />
                        <Area type="monotone" dataKey="count" stroke="#c8963e" fill="#c8963e" fillOpacity={0.15} name="Visites" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">Pas de données disponibles.</p>
                )}
              </div>
            </div>

            {/* ── Derniers projets ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-bold text-texte flex items-center gap-2">
                  <FolderOpen size={18} className="text-vert" />
                  Derniers projets
                </h3>
                {projetsRecents.length > 0 && (
                  <span className="text-xs text-gray-400">{projetsRecents.length} projet{projetsRecents.length > 1 ? 's' : ''} récent{projetsRecents.length > 1 ? 's' : ''}</span>
                )}
              </div>
              {projetsRecents.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <FolderOpen size={36} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aucun projet associatif actif sur votre territoire.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {projetsRecents.map((projet) => (
                    <ProjetCard
                      key={projet.id}
                      projet={projet}
                      associationNom={projet.associations?.nom}
                      lien={`/mon-association/projets/${projet.id}`}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Dernières actualités ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-bold text-texte flex items-center gap-2">
                  <Newspaper size={18} className="text-bleu" />
                  Dernières actualités
                </h3>
                <Link
                  to="/mairie/actualites"
                  className="text-sm text-bleu hover:text-bleu-clair transition-colors font-medium flex items-center gap-1"
                >
                  Gérer
                  <ArrowRight size={14} />
                </Link>
              </div>
              {actualitesRecentes.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                  <Newspaper size={36} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aucune actualité publiée.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {actualitesRecentes.map((actu) => (
                    <ActualiteCard key={actu.id} actualite={actu} />
                  ))}
                </div>
              )}
            </section>

          </main>
        </div>

      </div>
    </div>
  );
}
