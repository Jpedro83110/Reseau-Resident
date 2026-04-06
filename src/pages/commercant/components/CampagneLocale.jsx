// src/pages/commercant/components/CampagneLocale.jsx
// Module campagne pour booster la visibilité du commerce
import { useState } from 'react';
import { Megaphone, Star, Bell, Image, Lock } from 'lucide-react';

const OPTIONS = [
  { id: 'mise_en_avant', icon: Star, label: 'Mise en avant', desc: 'Votre commerce apparaît en premier dans les listes', dispo: true, gratuit: true },
  { id: 'notification', icon: Bell, label: 'Notification résidents', desc: 'Envoyez une offre à tous les résidents de la ville', dispo: false, gratuit: false },
  { id: 'banniere', icon: Image, label: 'Bannière événement', desc: 'Bannière visible sur la page d\'accueil pendant X jours', dispo: false, gratuit: false },
];

export default function CampagneLocale({ commerceId, villeId }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone size={20} className="text-or" />
        <h2 className="font-semibold text-texte">Boostez votre visibilité</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <div key={opt.id}
              className={`relative bg-white rounded-xl border p-5 transition-all ${
                opt.dispo ? 'border-gray-200 hover:border-bleu/40 hover:shadow-sm cursor-pointer' : 'border-gray-100 opacity-60'
              } ${selected === opt.id ? 'border-bleu shadow-sm ring-2 ring-bleu/20' : ''}`}
              onClick={() => opt.dispo && setSelected(opt.id)}
            >
              {!opt.dispo && (
                <div className="absolute top-2 right-2">
                  <Lock size={14} className="text-gray-400" />
                </div>
              )}
              <Icon size={24} className={opt.dispo ? 'text-bleu mb-3' : 'text-gray-300 mb-3'} />
              <h3 className="font-semibold text-sm text-texte mb-1">{opt.label}</h3>
              <p className="text-xs text-gray-500 mb-2">{opt.desc}</p>
              {opt.gratuit ? (
                <span className="inline-block px-2 py-0.5 bg-vert/10 text-vert text-[10px] font-bold rounded-full">Gratuit pendant le pilote</span>
              ) : (
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">Premium — bientôt</span>
              )}
            </div>
          );
        })}
      </div>

      {selected === 'mise_en_avant' && (
        <div className="bg-bleu/5 rounded-xl border border-bleu/20 p-5">
          <p className="text-sm text-texte mb-3">
            En activant la mise en avant, votre commerce apparaîtra en haut des listes pour les résidents de votre ville.
            Cette fonctionnalité est gratuite pendant la phase pilote.
          </p>
          <button className="px-5 py-2 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors">
            Activer la mise en avant
          </button>
        </div>
      )}
    </div>
  );
}
