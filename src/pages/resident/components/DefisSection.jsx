// src/pages/resident/components/DefisSection.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const TYPE_COLORS = {
  exploration: 'bg-blue-100 text-blue-700',
  commerce: 'bg-emerald-100 text-emerald-700',
  social: 'bg-purple-100 text-purple-700',
  culture: 'bg-amber-100 text-amber-700',
  sport: 'bg-red-100 text-red-700',
  eco: 'bg-green-100 text-green-700',
};

export default function DefisSection({ villeId, profileId }) {
  const [defis, setDefis] = useState([]);
  const [participations, setParticipations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!villeId) return;
    async function charger() {
      try {
        const { data: defisData } = await supabase
          .from('defis')
          .select('id, titre, description, type, points_recompense, objectif_nombre, date_fin, participants_count')
          .eq('ville_id', villeId)
          .eq('actif', true)
          .order('created_at', { ascending: false })
          .limit(6);
        setDefis(defisData ?? []);

        if (profileId) {
          const { data: partData } = await supabase
            .from('defis_participants')
            .select('defi_id, progression, complete')
            .eq('profile_id', profileId);
          const map = {};
          (partData ?? []).forEach((p) => { map[p.defi_id] = p; });
          setParticipations(map);
        }
      } catch {
        // Tables pas encore créées
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [villeId, profileId]);

  async function participer(defiId) {
    if (!profileId) return;
    const { error } = await supabase.from('defis_participants').insert({
      defi_id: defiId,
      profile_id: profileId,
    });
    if (!error) {
      setParticipations((p) => ({ ...p, [defiId]: { progression: 0, complete: false } }));
    }
  }

  if (isLoading) return null;
  if (defis.length === 0) return null;

  return (
    <div>
      <h3 className="font-serif text-lg font-bold text-texte mb-3 flex items-center gap-2">
        <Target size={18} className="text-or" />
        Défis de votre ville
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {defis.map((defi, i) => {
          const part = participations[defi.id];
          const pct = part ? Math.min((part.progression / defi.objectif_nombre) * 100, 100) : 0;

          return (
            <motion.div
              key={defi.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-texte truncate">{defi.titre}</h4>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{defi.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2 ${TYPE_COLORS[defi.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {defi.type}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} className="text-or" />
                <span className="text-xs font-bold text-or">{defi.points_recompense} pts</span>
                <span className="text-xs text-gray-400">· {defi.participants_count} participants</span>
              </div>

              {part ? (
                part.complete ? (
                  <div className="flex items-center gap-1 text-xs text-vert font-medium">
                    <CheckCircle2 size={14} />
                    Défi complété !
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>{part.progression}/{defi.objectif_nombre}</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-bleu rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                )
              ) : (
                <button
                  onClick={() => participer(defi.id)}
                  className="w-full mt-1 py-1.5 bg-bleu/5 hover:bg-bleu/10 text-bleu text-xs font-medium rounded-lg transition-colors"
                >
                  Participer
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
