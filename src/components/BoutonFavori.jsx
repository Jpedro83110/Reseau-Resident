// src/components/BoutonFavori.jsx
// Bouton cœur animé pour ajouter/retirer un favori
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BoutonFavori({ isFavori, onClick, size = 16, className = '' }) {
  return (
    <motion.button
      key={isFavori ? 'fav' : 'nofav'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      whileTap={{ scale: 0.85 }}
      animate={{ scale: [1, 1.25, 1] }}
      transition={{ duration: 0.3 }}
      className={`p-1.5 rounded-lg transition-colors ${
        isFavori
          ? 'text-red-500 bg-red-50 hover:bg-red-100'
          : 'text-gray-300 hover:text-red-400 hover:bg-gray-100'
      } ${className}`}
      title={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart size={size} fill={isFavori ? 'currentColor' : 'none'} />
    </motion.button>
  );
}
