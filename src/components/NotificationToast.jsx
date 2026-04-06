// src/components/NotificationToast.jsx
// Toast qui apparaît en haut à droite quand une nouvelle notification arrive
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell } from 'lucide-react';

const TYPE_ICONS = { offre: '🏷️', evenement: '📅', defi: '🏆', badge: '🎖️', projet: '📁', actualite: '📰', systeme: '🔔', info: 'ℹ️' };

export default function NotificationToast({ notification, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notification) return;
    setVisible(true);
    const timer = setTimeout(() => { setVisible(false); onDismiss?.(); }, 5000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  return (
    <AnimatePresence>
      {visible && notification && (
        <motion.div
          initial={{ opacity: 0, x: 100, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-20 right-4 z-[60] max-w-sm w-full bg-white rounded-xl shadow-xl border border-gray-200 p-4 flex items-start gap-3"
        >
          <span className="text-xl shrink-0">{TYPE_ICONS[notification.type] ?? '🔔'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-texte truncate">{notification.titre}</p>
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notification.message}</p>
          </div>
          <button onClick={() => { setVisible(false); onDismiss?.(); }} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
