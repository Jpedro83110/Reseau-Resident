// src/pages/association/DashboardAssociation.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, FolderOpen, Plus, Edit3, Check, X, Target,
  ExternalLink, Calendar, Newspaper, TrendingUp, Heart,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import GestionEvenements from '../../components/GestionEvenements';
import GestionActualites from '../../components/GestionActualites';
import ProjetCard from './components/ProjetCard';
import usePageMeta from '../../hooks/usePageMeta';

// ── Constantes ────────────────────────────────────────────────
const ONGLETS = [
  { id: 'projets', label: 'Mes projets', icon: FolderOpen },
  { id: 'evenements', label: 'Événements', icon: Calendar },
  { id: 'actualites', label: 'Actualités', icon: Newspaper },
  { id: 'profil', label: 'Mon association', icon: Users },
];

const CATEGORIES_ASSO = [
  'Sport', 'Culture', 'Éducation', 'Environnement', 'Social & Solidarité',
  'Santé', 'Loisirs & Jeunesse', 'Vie locale', 'Autre',
];

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, couleur = 'text-bleu' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${couleur} bg-current/10`}>
        <Icon size={22} className={couleur} />
      </div>
      <div>
        <p className="text-2xl font-bold text-texte">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ── Profil Association ────────────────────────────────────────
function ProfilAssociation({ association, onUpdate }) {
  const [edition, setEdition] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    nom: association.nom ?? '',
    categorie: association.categorie ?? '',
    description: association.description ?? '',
    adresse: association.adresse ?? '',
    email: association.email ?? '',
    telephone: association.telephone ?? '',
    site_web: association.site_web ?? '',
    numero_rna: association.numero_rna ?? '',
  });

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

  async function handleSave() {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('associations')
        .update({
          nom: form.nom.trim(),
          categorie: form.categorie,
          description: form.description.trim() || null,
          adresse: form.adresse.trim() || null,
          email: form.email.trim() || null,
          telephone: form.telephone.trim() || null,
          site_web: form.site_web.trim() || null,
          numero_rna: form.numero_rna.trim() || null,
        })
        .eq('id', association.id);
      if (error) throw error;
      onUpdate({ ...association, ...form });
      setEdition(false);
    } catch (err) {
      console.error('Erreur sauvegarde association:', err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      nom: association.nom ?? '',
      categorie: association.categorie ?? '',
      description: association.description ?? '',
      adresse: association.adresse ?? '',
      email: association.email ?? '',
      telephone: association.telephone ?? '',
      site_web: association.site_web ?? '',
      numero_rna: association.numero_rna ?? '',
    });
    setEdition(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-texte">Informations de l'association</h2>
        {!edition ? (
          <button onClick={() => setEdition(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Edit3 size={15} />
            Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <X size={15} />
              Annuler
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors">
              {isSaving
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Check size={15} />}
              Enregistrer
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'association</label>
            {edition
              ? <input type="text" className={inputClass} value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} />
              : <p className="text-texte font-semibold">{association.nom}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie</label>
            {edition
              ? <select className={inputClass} value={form.categorie} onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}>
                  <option value="">-- Choisir --</option>
                  {CATEGORIES_ASSO.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              : <p className="text-gray-600">{association.categorie || '—'}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            {edition
              ? <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              : <p className="text-gray-600">{association.email || '—'}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
            {edition
              ? <input type="tel" className={inputClass} value={form.telephone} onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))} />
              : <p className="text-gray-600">{association.telephone || '—'}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
            {edition
              ? <input type="text" className={inputClass} value={form.adresse} onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))} />
              : <p className="text-gray-600">{association.adresse || '—'}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Site web</label>
            {edition
              ? <input type="url" className={inputClass} value={form.site_web} placeholder="https://..." onChange={(e) => setForm((p) => ({ ...p, site_web: e.target.value }))} />
              : association.site_web
                ? <a href={association.site_web} target="_blank" rel="noopener noreferrer" className="text-bleu hover:underline text-sm flex items-center gap-1">{association.site_web} <ExternalLink size={12} /></a>
                : <p className="text-gray-400 text-sm">—</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">N° RNA</label>
            {edition
              ? <input type="text" className={inputClass} value={form.numero_rna} placeholder="W123456789" onChange={(e) => setForm((p) => ({ ...p, numero_rna: e.target.value }))} />
              : <p className="text-gray-600">{association.numero_rna || '—'}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            {edition
              ? <textarea rows={3} className={inputClass} value={form.description} placeholder="Présentez votre association..."
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              : <p className="text-gray-600 text-sm">{association.description || '—'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────
export default function DashboardAssociation() {
  const { user } = useAuthContext();
  usePageMeta('Mon association');

  const [onglet, setOnglet] = useState('projets');
  const [association, setAssociation] = useState(null);
  const [projets, setProjets] = useState([]);
  const [kpis, setKpis] = useState({ projetsActifs: 0, montantCollecte: 0, nbSoutiens: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    async function charger() {
      try {
        setIsLoading(true);

        // 1. Profil association
        const { data: profil, error: profilError } = await supabase
          .from('association_profiles')
          .select('association_id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profilError) throw profilError;
        if (!profil?.association_id) {
          setError('Aucune association associée à votre compte.');
          return;
        }

        // 2. Données association + projets + soutiens en parallèle (JOIN pour éviter cascade)
        const [assoRes, projetsRes, soutiensRes] = await Promise.all([
          supabase
            .from('associations')
            .select('id, nom, description, categorie, adresse, email, telephone, site_web, logo_url, numero_rna, actif, ville_id')
            .eq('id', profil.association_id)
            .maybeSingle(),
          supabase
            .from('projets')
            .select('id, titre, description, objectif_montant, montant_collecte, objectif_description, paliers, image_url, date_limite, statut, source, created_at')
            .eq('association_id', profil.association_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('soutiens')
            .select('id, montant, projet_id, projets!inner(association_id)')
            .eq('projets.association_id', profil.association_id),
        ]);

        if (assoRes.error) throw assoRes.error;
        if (!assoRes.data) { setError('Association introuvable.'); return; }

        const lesProjets = projetsRes.data ?? [];
        const lesSoutiens = soutiensRes.data ?? [];

        setAssociation(assoRes.data);
        setProjets(lesProjets);
        setKpis({
          projetsActifs: lesProjets.filter((p) => p.statut === 'actif').length,
          montantCollecte: lesProjets.reduce((acc, p) => acc + (p.montant_collecte ?? 0), 0),
          nbSoutiens: lesSoutiens.length,
        });
      } catch (err) {
        setError('Erreur lors du chargement de votre association.');
        console.error('Erreur DashboardAssociation:', err);
      } finally {
        setIsLoading(false);
      }
    }

    charger();
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Chargement de votre association…</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── En-tête avec logo ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-5 mb-8"
        >
          {association.logo_url ? (
            <img
              src={association.logo_url}
              alt={`Logo ${association.nom}`}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-gray-200 shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-bleu/10 flex items-center justify-center shrink-0">
              <Users size={30} className="text-bleu" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-texte truncate">
              {association.nom}
            </h1>
            <p className="text-gray-500 text-sm flex items-center gap-1.5 mt-0.5">
              {association.categorie ?? 'Association'} · Réseaux-Résident
            </p>
          </div>
        </motion.div>

        {/* ── KPIs ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <KpiCard icon={FolderOpen} label="Projets actifs" value={kpis.projetsActifs} couleur="text-bleu" />
          <KpiCard icon={TrendingUp} label="Montant collecté" value={`${kpis.montantCollecte.toLocaleString('fr-FR')}€`} couleur="text-vert" />
          <KpiCard icon={Heart} label="Soutiens reçus" value={kpis.nbSoutiens} couleur="text-or" />
        </motion.div>

        {/* ── Navigation onglets ── */}
        <div className="flex flex-wrap gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-8 w-fit">
          {ONGLETS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setOnglet(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                onglet === id
                  ? 'bg-bleu text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Contenu ── */}
        <motion.div
          key={onglet}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {onglet === 'projets' && (
            <div className="space-y-6">
              {/* Bouton CTA */}
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-bold text-texte">Mes projets</h2>
                <Link
                  to="/mon-association/projets/nouveau"
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-bleu text-white rounded-xl hover:bg-bleu-clair transition-colors shadow-sm"
                >
                  <Plus size={18} />
                  Créer un nouveau projet
                </Link>
              </div>

              {projets.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Target size={40} className="text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2 font-medium">Aucun projet créé</p>
                  <p className="text-gray-400 text-sm mb-6">
                    Lancez votre premier projet pour mobiliser les résidents et commerçants de votre ville !
                  </p>
                  <Link
                    to="/mon-association/projets/nouveau"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Créer un projet
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {projets.map((projet) => (
                    <ProjetCard
                      key={projet.id}
                      projet={projet}
                      lien={`/mon-association/projets/${projet.id}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {onglet === 'evenements' && (
            <GestionEvenements
              organisateurType="association"
              organisateurId={association.id}
              villeId={association.ville_id}
            />
          )}
          {onglet === 'actualites' && (
            <GestionActualites
              auteurType="association"
              auteurId={association.id}
              villeId={association.ville_id}
            />
          )}
          {onglet === 'profil' && (
            <ProfilAssociation association={association} onUpdate={setAssociation} />
          )}
        </motion.div>

      </div>
    </div>
  );
}
