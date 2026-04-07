// src/components/NotificationsPanel.jsx
// Panneau de notifications pour la Navbar (cloche)
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Tag, Calendar, FolderOpen, Newspaper, Info } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const TYPE_ICONS = {
  offre: Tag,
  evenement: Calendar,
  projet: FolderOpen,
  actualite: Newspaper,
  systeme: Info,
};

const TYPE_COLORS = {
  offre: 'text-or bg-or/10',
  evenement: 'text-bleu bg-bleu/10',
  projet: 'text-vert bg-vert/10',
  actualite: 'text-purple-600 bg-purple-50',
  systeme: 'text-gray-500 bg-gray-100',
};

export default function NotificationsPanel({ userId, isScrolled }) {
  const [ouvert, setOuvert] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, nonLues, marquerLue, marquerToutesLues } = useNotifications(userId);

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOuvert(false);
      }
    }
    if (ouvert) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ouvert]);

  function handleNotifClick(notif) {
    marquerLue(notif.id);
    if (notif.lien) {
      navigate(notif.lien);
      setOuvert(false);
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOuvert(!ouvert)}
        className={`relative p-2 rounded-lg transition-colors ${
          isScrolled ? 'text-texte hover:bg-gray-100' : 'text-white hover:bg-white/10'
        }`}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 top-full mt-2 w-full sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-texte text-sm">Notifications</h3>
            {nonLues > 0 && (
              <button
                onClick={marquerToutesLues}
                className="text-xs text-bleu hover:text-bleu-clair font-medium flex items-center gap-1 transition-colors"
              >
                <Check size={12} />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] ?? Info;
                const color = TYPE_COLORS[notif.type] ?? TYPE_COLORS.systeme;

                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                      !notif.lu ? 'bg-bleu/5' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${!notif.lu ? 'text-texte' : 'text-gray-600'}`}>
                        {notif.titre}
                      </p>
                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{formatDate(notif.created_at)}</p>
                    </div>
                    {!notif.lu && (
                      <div className="w-2 h-2 rounded-full bg-bleu shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
