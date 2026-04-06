// src/pages/commercant/components/AvisClients.jsx
// Liste des avis reçus par le commerce + possibilité de répondre
import { useState, useEffect } from 'react';
import { Star, MessageCircle, Send } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

function StarRating({ note }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} className={n <= note ? 'text-or fill-or' : 'text-gray-200'} />
      ))}
    </div>
  );
}

export default function AvisClients({ commerceId }) {
  const [avis, setAvis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reponseId, setReponseId] = useState(null);
  const [reponseText, setReponseText] = useState('');

  useEffect(() => {
    if (!commerceId) return;
    supabase.from('avis')
      .select('id, note, commentaire, reponse_commerce, created_at, profiles(prenom, nom)')
      .eq('commerce_id', commerceId)
      .eq('publie', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setAvis(data ?? []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [commerceId]);

  async function envoyerReponse(avisId) {
    if (!reponseText.trim()) return;
    const { error } = await supabase.from('avis').update({ reponse_commerce: reponseText.trim() }).eq('id', avisId);
    if (!error) {
      setAvis((prev) => prev.map((a) => a.id === avisId ? { ...a, reponse_commerce: reponseText.trim() } : a));
      setReponseId(null);
      setReponseText('');
    }
  }

  if (isLoading) return <div className="text-center py-8"><div className="w-6 h-6 border-4 border-gray-200 border-t-bleu rounded-full animate-spin mx-auto" /></div>;

  const noteMoyenne = avis.length > 0 ? (avis.reduce((s, a) => s + a.note, 0) / avis.length).toFixed(1) : '—';

  return (
    <div className="space-y-4">
      {/* Résumé */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-texte">{noteMoyenne}</div>
          <StarRating note={Math.round(Number(noteMoyenne) || 0)} />
          <div className="text-xs text-gray-400 mt-1">{avis.length} avis</div>
        </div>
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = avis.filter((a) => a.note === n).length;
            const pct = avis.length > 0 ? (count / avis.length) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs mb-1">
                <span className="w-3 text-right text-gray-500">{n}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-or rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-5 text-gray-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste */}
      {avis.length === 0 ? (
        <div className="text-center py-8">
          <Star size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Aucun avis pour le moment</p>
        </div>
      ) : avis.map((a) => (
        <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <StarRating note={a.note} />
              <span className="text-xs text-gray-500">{a.profiles?.prenom} {a.profiles?.nom?.charAt(0)}.</span>
            </div>
            <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          {a.commentaire && <p className="text-sm text-gray-700 mb-2">{a.commentaire}</p>}

          {a.reponse_commerce ? (
            <div className="bg-bleu/5 rounded-lg p-3 mt-2">
              <p className="text-xs font-bold text-bleu mb-1">Votre réponse</p>
              <p className="text-xs text-gray-600">{a.reponse_commerce}</p>
            </div>
          ) : (
            reponseId === a.id ? (
              <div className="flex gap-2 mt-2">
                <input value={reponseText} onChange={(e) => setReponseText(e.target.value)} placeholder="Votre réponse..."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                <button onClick={() => envoyerReponse(a.id)} className="p-2 bg-bleu text-white rounded-lg hover:bg-bleu-clair transition-colors">
                  <Send size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => { setReponseId(a.id); setReponseText(''); }}
                className="flex items-center gap-1 text-xs text-bleu hover:text-bleu-clair mt-2 transition-colors">
                <MessageCircle size={12} /> Répondre
              </button>
            )
          )}
        </div>
      ))}
    </div>
  );
}
