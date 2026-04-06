// src/components/ParrainageEspace.jsx
// Module de parrainage dans le dashboard résident
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gift, Copy, Check, Users, Clock, Share2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function ParrainageEspace() {
  const { user, profile } = useAuth();
  const [codeParrainage, setCodeParrainage] = useState(profile?.code_parrainage ?? '');
  const [parrainages, setParrainages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function charger() {
      try {
        // Générer le code si manquant
        if (!profile?.code_parrainage) {
          const code = `RR-${user.id.substring(0, 6).toUpperCase()}`;
          const { error } = await supabase
            .from('profiles')
            .update({ code_parrainage: code })
            .eq('id', user.id);
          if (!error) setCodeParrainage(code);
        }

        // Charger les parrainages
        const { data, error } = await supabase
          .from('parrainages')
          .select('id, statut, created_at, filleul:filleul_id(prenom, nom)')
          .eq('parrain_id', user.id)
          .order('created_at', { ascending: false });

        if (!error) setParrainages(data ?? []);
      } catch (err) {
        console.error('Erreur chargement parrainages:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user, profile]);

  function handleCopier() {
    navigator.clipboard.writeText(codeParrainage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePartager() {
    const texte = `Rejoins Réseaux-Résident avec mon code parrain ${codeParrainage} ! Inscris-toi ici :`;
    const url = `${window.location.origin}/inscription-compte?parrain=${codeParrainage}`;

    if (navigator.share) {
      // L'utilisateur peut annuler le partage, erreur normale
      navigator.share({ title: 'Réseaux-Résident', text: texte, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${texte} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const valides = parrainages.filter((p) => p.statut === 'valide').length;
  const enAttente = parrainages.filter((p) => p.statut === 'en_attente').length;

  return (
    <section className="space-y-5">
      <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2">
        <Gift size={20} className="text-or" />
        Parrainage
      </h2>

      {/* Code parrainage */}
      <div className="bg-gradient-to-r from-bleu to-bleu-clair rounded-xl p-6 text-white">
        <p className="text-sm opacity-80 mb-2">Votre code parrain</p>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl font-mono font-bold tracking-widest">{codeParrainage || '...'}</span>
          <button
            onClick={handleCopier}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Copier"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
        <button
          onClick={handlePartager}
          className="flex items-center gap-2 px-4 py-2 bg-white text-bleu font-medium text-sm rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Share2 size={15} />
          Partager mon code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Users size={18} className="text-vert mx-auto mb-2" />
          <p className="text-2xl font-bold text-texte">{valides}</p>
          <p className="text-xs text-gray-400">Filleul{valides !== 1 ? 's' : ''} validé{valides !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Clock size={18} className="text-or mx-auto mb-2" />
          <p className="text-2xl font-bold text-texte">{enAttente}</p>
          <p className="text-xs text-gray-400">En attente</p>
        </div>
      </div>

      {/* Historique */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-3 border-bleu border-t-transparent rounded-full animate-spin" />
        </div>
      ) : parrainages.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Gift size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            Partagez votre code avec vos proches pour les inviter sur Réseaux-Résident !
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500">Historique des parrainages</p>
          </div>
          <div className="divide-y divide-gray-50">
            {parrainages.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-texte">
                    {p.filleul?.prenom ?? '?'} {p.filleul?.nom ?? ''}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  p.statut === 'valide' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {p.statut === 'valide' ? 'Validé' : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
