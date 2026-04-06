// src/components/ExportBilans.jsx
// Export CSV des données territoriales pour le dashboard mairie
import { useState } from 'react';
import { Download, FileText, Users, Store, FolderOpen, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

const EXPORTS = [
  {
    id: 'residents',
    label: 'Résidents inscrits',
    icon: Users,
    description: 'Liste des résidents inscrits avec email et date d\'inscription',
  },
  {
    id: 'commerces',
    label: 'Commerces partenaires',
    icon: Store,
    description: 'Commerces actifs avec catégorie, adresse et nombre de visites',
  },
  {
    id: 'projets',
    label: 'Projets associatifs',
    icon: FolderOpen,
    description: 'Projets en cours avec montants collectés et objectifs',
  },
  {
    id: 'evenements',
    label: 'Événements',
    icon: Calendar,
    description: 'Événements publiés avec dates, lieux et organisateurs',
  },
];

function telechargerCSV(nom, colonnes, lignes) {
  const BOM = '\uFEFF';
  const header = colonnes.join(';');
  const rows = lignes.map((row) =>
    colonnes.map((col) => {
      let val = row[col] ?? '';
      if (typeof val === 'object') val = JSON.stringify(val);
      val = String(val).replace(/"/g, '""');
      if (val.includes(';') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
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

export default function ExportBilans({ villeId }) {
  const [isExporting, setIsExporting] = useState(null);

  async function handleExport(type) {
    try {
      setIsExporting(type);

      switch (type) {
        case 'residents': {
          const { data } = await supabase
            .from('profiles')
            .select('prenom, nom, email, adresse, created_at')
            .eq('ville_id', villeId)
            .order('created_at', { ascending: false });
          telechargerCSV('residents', ['prenom', 'nom', 'email', 'adresse', 'created_at'], data ?? []);
          break;
        }

        case 'commerces': {
          const { data } = await supabase
            .from('commerces')
            .select('nom, categorie, adresse, telephone, avantage, actif, visites, created_at')
            .eq('ville_id', villeId)
            .order('nom');
          telechargerCSV('commerces', ['nom', 'categorie', 'adresse', 'telephone', 'avantage', 'actif', 'visites', 'created_at'], data ?? []);
          break;
        }

        case 'projets': {
          const { data } = await supabase
            .from('projets')
            .select('titre, description, objectif_montant, montant_collecte, statut, date_limite, source, created_at, associations(nom)')
            .eq('ville_id', villeId)
            .order('created_at', { ascending: false });
          const lignes = (data ?? []).map((p) => ({
            titre: p.titre,
            association: p.associations?.nom ?? '',
            objectif_montant: p.objectif_montant,
            montant_collecte: p.montant_collecte,
            statut: p.statut,
            date_limite: p.date_limite,
            source: p.source,
            created_at: p.created_at,
          }));
          telechargerCSV('projets', ['titre', 'association', 'objectif_montant', 'montant_collecte', 'statut', 'date_limite', 'source', 'created_at'], lignes);
          break;
        }

        case 'evenements': {
          const { data } = await supabase
            .from('evenements')
            .select('titre, organisateur_type, lieu, adresse, date_debut, date_fin, categorie, gratuit, prix, statut, created_at')
            .eq('ville_id', villeId)
            .order('date_debut', { ascending: false });
          telechargerCSV('evenements', ['titre', 'organisateur_type', 'lieu', 'adresse', 'date_debut', 'date_fin', 'categorie', 'gratuit', 'prix', 'statut', 'created_at'], data ?? []);
          break;
        }
      }
    } catch (err) {
      console.error('Erreur export:', err);
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold text-texte mb-1">Export des bilans</h2>
        <p className="text-sm text-gray-500">Téléchargez les données de votre territoire au format CSV (compatible Excel).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map(({ id, label, icon: Icon, description }) => (
          <div key={id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-bleu/10 flex items-center justify-center text-bleu shrink-0">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-texte text-sm mb-0.5">{label}</h3>
              <p className="text-xs text-gray-400 mb-3">{description}</p>
              <button
                onClick={() => handleExport(id)}
                disabled={isExporting !== null}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors"
              >
                {isExporting === id ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                Exporter CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 flex items-start gap-3">
        <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">
          Les exports contiennent les données actuelles de votre territoire.
          Les fichiers CSV utilisent le séparateur point-virgule (;) pour une compatibilité optimale avec Excel.
        </p>
      </div>
    </div>
  );
}
