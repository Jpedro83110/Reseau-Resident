// src/pages/commercant/components/ExportDonneesCommerce.jsx
// Export CSV des visites du commerce sur les 30 derniers jours
import { useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function ExportDonneesCommerce({ commerceId, commerceNom }) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  async function handleExport() {
    try {
      setIsExporting(true);
      setError(null);

      const il30j = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: visites, error: qErr } = await supabase
        .from('visites')
        .select('date_visite, source, carte_id, cartes(numero)')
        .eq('commerce_id', commerceId)
        .gte('date_visite', il30j)
        .order('date_visite', { ascending: false });

      if (qErr) throw qErr;

      // Générer le CSV
      const lignes = [
        ['Date', 'Source', 'Numéro carte'].join(';'),
        ...(visites ?? []).map((v) => [
          new Date(v.date_visite).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          v.source ?? 'inconnue',
          v.cartes?.numero ?? '—',
        ].join(';')),
      ];

      const csv = '\uFEFF' + lignes.join('\n'); // BOM UTF-8 pour Excel
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nomFichier = `visites-${(commerceNom ?? 'commerce').replace(/[^a-zA-Z0-9]/g, '_')}-30j.csv`;
      a.href = url;
      a.download = nomFichier;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export CSV:', err);
      setError('Erreur lors de l\'export.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <span className="w-4 h-4 border-2 border-gray-300 border-t-bleu rounded-full animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {isExporting ? 'Export en cours...' : 'Exporter CSV (30 jours)'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
