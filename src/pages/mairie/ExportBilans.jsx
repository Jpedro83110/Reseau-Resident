// src/pages/mairie/ExportBilans.jsx
// Page d'export CSV des données territoriales avec sélecteur de période et preview.
import { useState, useEffect } from 'react';
import {
  Download, FileText, Users, Store, FolderOpen, Calendar,
  MapPin, Eye, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

// ── Constantes ───────────────────────────────────────────────
const PERIODES = [
  { value: '1m',  label: 'Ce mois' },
  { value: '3m',  label: '3 derniers mois' },
  { value: '6m',  label: '6 derniers mois' },
  { value: '1a',  label: '1 an' },
  { value: 'all', label: 'Tout' },
];

const EXPORTS = [
  {
    id: 'residents',
    label: 'Résidents inscrits',
    icon: Users,
    description: 'Liste des résidents avec prénom, nom, email et date d\'inscription.',
    colonnes: ['prenom', 'nom', 'email', 'adresse', 'created_at'],
    colonnesLabel: ['Prénom', 'Nom', 'Email', 'Adresse', 'Inscription'],
  },
  {
    id: 'commerces',
    label: 'Commerces partenaires',
    icon: Store,
    description: 'Commerces actifs avec catégorie, adresse et visites.',
    colonnes: ['nom', 'categorie', 'adresse', 'telephone', 'avantage', 'visites', 'created_at'],
    colonnesLabel: ['Nom', 'Catégorie', 'Adresse', 'Téléphone', 'Avantage', 'Visites', 'Inscription'],
  },
  {
    id: 'projets',
    label: 'Projets associatifs',
    icon: FolderOpen,
    description: 'Projets avec montants collectés, objectifs et statut.',
    colonnes: ['titre', 'association', 'objectif_montant', 'montant_collecte', 'statut', 'date_limite', 'created_at'],
    colonnesLabel: ['Titre', 'Association', 'Objectif (€)', 'Collecté (€)', 'Statut', 'Date limite', 'Création'],
  },
  {
    id: 'visites',
    label: 'Visites (scans)',
    icon: Calendar,
    description: 'Journal des visites enregistrées chez les commerçants.',
    colonnes: ['commerce', 'carte_numero', 'source', 'date_visite'],
    colonnesLabel: ['Commerce', 'N° carte', 'Source', 'Date'],
  },
];

// ── Utilitaire CSV ───────────────────────────────────────────
function telechargerCSV(nom, colonnes, lignes) {
  const BOM = '\uFEFF';
  const header = colonnes.join(';');
  const rows = lignes.map((row) =>
    colonnes.map((col) => {
      let val = row[col] ?? '';
      if (typeof val === 'object') val = JSON.stringify(val);
      val = String(val).replace(/"/g, '""');
      if (val.includes(';') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
      return val;
    }).join(';')
  );
  const csv = BOM + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nom}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function dateLimite(periode) {
  if (periode === 'all') return null;
  const d = new Date();
  if (periode === '1m') d.setMonth(d.getMonth() - 1);
  else if (periode === '3m') d.setMonth(d.getMonth() - 3);
  else if (periode === '6m') d.setMonth(d.getMonth() - 6);
  else if (periode === '1a') d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

// ── Composant principal ──────────────────────────────────────
export default function ExportBilans() {
  const { user } = useAuth();
  usePageMeta('Mairie \u2014 Export');

  const [ville, setVille] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periode, setPeriode] = useState('6m');
  const [previewType, setPreviewType] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    async function charger() {
      try {
        setIsLoading(true);
        const { data: profil } = await supabase.from('mairie_profiles').select('ville_id').eq('id', user.id).maybeSingle();
        if (!profil?.ville_id) { setError('Aucune ville associée.'); return; }
        const { data: v } = await supabase.from('villes').select('id, nom').eq('id', profil.ville_id).maybeSingle();
        if (!v) { setError('Ville introuvable.'); return; }
        setVille(v);
      } catch (err) {
        setError('Erreur de chargement.');
        console.error('Erreur ExportBilans:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user]);

  // Requête données par type
  async function fetchData(type) {
    const depuis = dateLimite(periode);
    const villeId = ville.id;

    switch (type) {
      case 'residents': {
        let q = supabase.from('profiles').select('prenom, nom, email, adresse, created_at').eq('ville_id', villeId).order('created_at', { ascending: false });
        if (depuis) q = q.gte('created_at', depuis);
        const { data } = await q;
        return data ?? [];
      }
      case 'commerces': {
        let q = supabase.from('commerces').select('nom, categorie, adresse, telephone, avantage, visites, created_at').eq('ville_id', villeId).order('nom');
        if (depuis) q = q.gte('created_at', depuis);
        const { data } = await q;
        return data ?? [];
      }
      case 'projets': {
        let q = supabase.from('projets').select('titre, objectif_montant, montant_collecte, statut, date_limite, created_at, associations(nom)').eq('ville_id', villeId).order('created_at', { ascending: false });
        if (depuis) q = q.gte('created_at', depuis);
        const { data } = await q;
        return (data ?? []).map((p) => ({ ...p, association: p.associations?.nom ?? '' }));
      }
      case 'visites': {
        const comIds = ((await supabase.from('commerces').select('id, nom').eq('ville_id', villeId)).data ?? []);
        const comMap = Object.fromEntries(comIds.map((c) => [c.id, c.nom]));
        const ids = comIds.map((c) => c.id);
        if (ids.length === 0) return [];
        let q = supabase.from('visites').select('commerce_id, carte_id, source, date_visite, cartes(numero)').in('commerce_id', ids).order('date_visite', { ascending: false });
        if (depuis) q = q.gte('date_visite', depuis);
        const { data } = await q;
        return (data ?? []).map((v) => ({
          commerce: comMap[v.commerce_id] ?? '',
          carte_numero: v.cartes?.numero ?? '',
          source: v.source ?? '',
          date_visite: v.date_visite,
        }));
      }
      default:
        return [];
    }
  }

  async function handlePreview(type) {
    if (previewType === type) { setPreviewType(null); return; }
    try {
      setIsPreviewLoading(true);
      setPreviewType(type);
      const data = await fetchData(type);
      setPreviewData(data);
    } catch (err) {
      console.error('Erreur preview:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleExport(type) {
    try {
      setIsExporting(type);
      const data = previewType === type && previewData.length > 0 ? previewData : await fetchData(type);
      const config = EXPORTS.find((e) => e.id === type);
      telechargerCSV(`${type}_${ville.nom.replace(/\s/g, '-')}`, config.colonnes, data);
    } catch (err) {
      console.error('Erreur export:', err);
    } finally {
      setIsExporting(null);
    }
  }

  function formatCellule(val) {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return new Date(val).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(val);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-4">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const exportConfig = previewType ? EXPORTS.find((e) => e.id === previewType) : null;

  return (
    <div className="min-h-screen pt-28 pb-24 lg:pb-12 bg-creme">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-texte mb-1">{ville.nom}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            <MapPin size={14} /> Export des bilans
          </p>
        </div>

        <div className="flex gap-8">
          <MairieNav />

          <main className="flex-1 min-w-0 space-y-6">
            {/* Sélecteur de période */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-xl font-bold text-texte">Exporter les données</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Période :</span>
                <div className="relative">
                  <select
                    value={periode}
                    onChange={(e) => { setPeriode(e.target.value); setPreviewType(null); }}
                    className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none cursor-pointer"
                  >
                    {PERIODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Cartes export */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXPORTS.map(({ id, label, icon: Icon, description }) => (
                <div key={id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-bleu/10 flex items-center justify-center text-bleu shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-texte text-sm mb-0.5">{label}</h3>
                      <p className="text-xs text-gray-400 mb-3">{description}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePreview(id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            previewType === id
                              ? 'bg-bleu/10 text-bleu'
                              : 'text-gray-500 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Eye size={13} />
                          {previewType === id ? 'Masquer' : 'Aperçu'}
                        </button>
                        <button
                          onClick={() => handleExport(id)}
                          disabled={isExporting !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors"
                        >
                          {isExporting === id ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                          CSV
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview tableau */}
            {previewType && exportConfig && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-texte">
                    Aperçu : {exportConfig.label}
                    {!isPreviewLoading && (
                      <span className="text-gray-400 font-normal ml-2">({previewData.length} lignes)</span>
                    )}
                  </h3>
                  <button
                    onClick={() => handleExport(previewType)}
                    disabled={isExporting !== null || previewData.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors"
                  >
                    <Download size={12} />
                    Exporter ces données
                  </button>
                </div>

                {isPreviewLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-3 border-bleu border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : previewData.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-400">Aucune donnée pour cette période.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {exportConfig.colonnesLabel.map((col) => (
                            <th key={col} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 20).map((row, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                            {exportConfig.colonnes.map((col) => (
                              <td key={col} className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                                {formatCellule(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.length > 20 && (
                      <div className="px-5 py-3 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-400">
                          Affichage des 20 premières lignes sur {previewData.length}. L'export CSV contient toutes les données.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-start gap-3">
              <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                Les fichiers CSV utilisent le séparateur point-virgule (;) et l'encodage UTF-8 BOM pour une compatibilité optimale avec Excel.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
