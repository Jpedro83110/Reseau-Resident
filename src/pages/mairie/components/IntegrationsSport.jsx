// src/pages/mairie/components/IntegrationsSport.jsx
// Projets remontés de SimplyFoot / SimplyRugby
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const SOURCE_CONFIG = {
  simplyfoot: { label: 'SimplyFoot', emoji: '⚽', color: 'bg-green-100 text-green-700' },
  simplyfot: { label: 'SimplyFoot', emoji: '⚽', color: 'bg-green-100 text-green-700' },
  simplyrugby: { label: 'SimplyRugby', emoji: '🏉', color: 'bg-amber-100 text-amber-700' },
};

export default function IntegrationsSport({ villeId }) {
  const [projets, setProjets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!villeId) return;
    supabase.from('projets')
      .select('id, titre, description, objectif_montant, montant_collecte, source, statut, created_at, associations(nom)')
      .eq('ville_id', villeId)
      .in('source', ['simplyfoot', 'simplyfot', 'simplyrugby'])
      .order('created_at', { ascending: false })
      .then(({ data }) => { setProjets(data ?? []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [villeId]);

  if (isLoading) return <div className="text-center py-4"><div className="w-5 h-5 border-2 border-gray-200 border-t-bleu rounded-full animate-spin mx-auto" /></div>;

  const totalCollecte = projets.reduce((s, p) => s + Number(p.montant_collecte || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-sm text-texte mb-4">Intégrations sportives</h3>

      {projets.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Aucun projet synchronisé depuis SimplyFoot ou SimplyRugby</p>
      ) : (
        <>
          <div className="flex gap-4 mb-4 text-xs">
            <span className="font-bold text-texte">{projets.length} projet{projets.length > 1 ? 's' : ''} sync</span>
            <span className="text-vert font-bold">{totalCollecte.toLocaleString('fr-FR')}€ collectés</span>
          </div>
          <div className="space-y-2">
            {projets.map((p) => {
              const cfg = SOURCE_CONFIG[p.source] ?? SOURCE_CONFIG.simplyfoot;
              const pct = p.objectif_montant > 0 ? Math.min((p.montant_collecte / p.objectif_montant) * 100, 100) : 0;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="text-xl">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-texte truncate">{p.titre}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="w-full h-1 bg-gray-200 rounded-full mt-1">
                      <div className="h-full bg-vert rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
