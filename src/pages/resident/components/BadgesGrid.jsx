// src/pages/resident/components/BadgesGrid.jsx
import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function BadgesGrid({ profileId }) {
  const [badges, setBadges] = useState([]);
  const [obtenus, setObtenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    async function charger() {
      try {
        const [badgesRes, obtenusRes] = await Promise.all([
          supabase.from('badges').select('id, slug, nom, description, icone, condition_type, condition_value, points_gagnes').order('points_gagnes'),
          supabase.from('badges_utilisateurs').select('badge_id, obtenu_le').eq('profile_id', profileId),
        ]);
        setBadges(badgesRes.data ?? []);
        setObtenus((obtenusRes.data ?? []).map((b) => b.badge_id));
      } catch {
        // Tables pas encore créées — pas grave
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [profileId]);

  if (isLoading) return null;
  if (badges.length === 0) return null;

  return (
    <div>
      <h3 className="font-serif text-lg font-bold text-texte mb-3">Mes badges</h3>
      <div className="flex flex-wrap gap-3">
        {badges.map((badge) => {
          const debloque = obtenus.includes(badge.id);
          return (
            <div
              key={badge.id}
              className={`relative group flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all ${
                debloque
                  ? 'bg-white border-or/30 shadow-sm hover:shadow-md'
                  : 'bg-gray-50 border-gray-200 opacity-40'
              }`}
              title={`${badge.nom} — ${badge.description}`}
            >
              <span className="text-2xl">{badge.icone}</span>
              {!debloque && (
                <Lock size={10} className="absolute bottom-1 right-1 text-gray-400" />
              )}
              {/* Tooltip au hover */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {badge.nom}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
