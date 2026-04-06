// src/pages/resident/components/NiveauBar.jsx
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export default function NiveauBar({ points = 0, niveau = 1 }) {
  const palierSuivant = niveau * 100;
  const progression = Math.min((points / palierSuivant) * 100, 100);
  const pointsRestants = Math.max(palierSuivant - points, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-or/10 flex items-center justify-center">
            <Star size={16} className="text-or" />
          </div>
          <div>
            <span className="text-sm font-bold text-texte">Niveau {niveau}</span>
            <span className="text-xs text-gray-400 ml-2">{points} pts</span>
          </div>
        </div>
        <span className="text-xs text-gray-500">{pointsRestants} pts pour le niveau {niveau + 1}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-or to-or-clair rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progression}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
