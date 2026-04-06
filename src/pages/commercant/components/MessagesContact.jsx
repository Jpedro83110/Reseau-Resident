// src/pages/commercant/components/MessagesContact.jsx
// Messagerie commerçant → équipe Réseaux-Résident
import { useState, useEffect } from 'react';
import { Send, Mail, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function MessagesContact({ userId }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sujet, setSujet] = useState('');
  const [contenu, setContenu] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from('messages').select('id, sujet, contenu, lu, reponse, repondu_le, created_at')
      .eq('expediteur_id', userId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { setMessages(data ?? []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [userId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sujet.trim() || !contenu.trim()) return;
    setSending(true);
    const { data, error } = await supabase.from('messages').insert({
      expediteur_id: userId,
      expediteur_type: 'commerce',
      sujet: sujet.trim(),
      contenu: contenu.trim(),
    }).select().single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) => [data, ...prev]);
      setSujet('');
      setContenu('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    }
  }

  if (isLoading) return <div className="text-center py-8"><div className="w-6 h-6 border-4 border-gray-200 border-t-bleu rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      {/* Formulaire */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-texte mb-1">Contacter l'équipe Réseaux-Résident</h3>
        <p className="text-xs text-gray-500 mb-4">Notre équipe vous répond sous 48h.</p>

        {sent && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> Message envoyé !
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Sujet" required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <textarea value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Votre message..." required rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          <button type="submit" disabled={sending}
            className="flex items-center gap-2 px-5 py-2 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors disabled:opacity-50">
            <Send size={14} /> {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </form>
      </div>

      {/* Historique */}
      {messages.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-texte mb-3">Mes messages ({messages.length})</h3>
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm text-texte">{m.sujet}</h4>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {m.lu ? <Mail size={12} className="text-vert" /> : <Clock size={12} />}
                    {new Date(m.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{m.contenu}</p>
                {m.reponse && (
                  <div className="mt-2 bg-bleu/5 rounded-lg p-3">
                    <p className="text-xs font-bold text-bleu mb-1">Réponse de l'équipe</p>
                    <p className="text-xs text-gray-600">{m.reponse}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{m.repondu_le ? new Date(m.repondu_le).toLocaleDateString('fr-FR') : ''}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
