// src/pages/mairie/GestionDefis.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, X, Users, Zap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

const TYPES = [
  { value: 'exploration', label: 'Exploration', color: 'bg-blue-100 text-blue-700' },
  { value: 'commerce', label: 'Commerce', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'social', label: 'Social', color: 'bg-purple-100 text-purple-700' },
  { value: 'culture', label: 'Culture', color: 'bg-amber-100 text-amber-700' },
  { value: 'sport', label: 'Sport', color: 'bg-red-100 text-red-700' },
  { value: 'eco', label: 'Éco', color: 'bg-green-100 text-green-700' },
];

const SUGGESTIONS = [
  { titre: 'Visitez 3 commerces du centre-ville', type: 'exploration', points: 30, objectif: 3, desc: 'Découvrez les commerces partenaires de votre quartier.' },
  { titre: 'Assistez à un événement municipal', type: 'culture', points: 20, objectif: 1, desc: 'Participez à la vie culturelle de votre ville.' },
  { titre: 'Recommandez la plateforme à un ami', type: 'social', points: 50, objectif: 1, desc: 'Partagez Réseaux-Résident avec vos proches.' },
  { titre: 'Achetez local chez 5 commerçants', type: 'commerce', points: 40, objectif: 5, desc: 'Soutenez l\'économie locale en consommant chez nos partenaires.' },
  { titre: 'Participez au nettoyage de plage', type: 'eco', points: 100, objectif: 1, desc: 'Rejoignez l\'opération environnementale de la ville.' },
];

export default function GestionDefis() {
  const { user } = useAuth();
  usePageMeta('Mairie — Défis citoyens');

  const [villeId, setVilleId] = useState(null);
  const [defis, setDefis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titre: '', description: '', type: 'exploration', points_recompense: 20, objectif_description: '', objectif_nombre: 1, date_fin: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    async function charger() {
      try {
        const { data: profil } = await supabase.from('mairie_profiles').select('ville_id').eq('id', user.id).maybeSingle();
        if (!profil) { setIsLoading(false); return; }
        setVilleId(profil.ville_id);
        const { data } = await supabase.from('defis').select('*').eq('ville_id', profil.ville_id).order('created_at', { ascending: false });
        setDefis(data ?? []);
      } catch (err) {
        console.error('Erreur GestionDefis:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user]);

  function useSuggestion(s) {
    setForm({ titre: s.titre, description: s.desc, type: s.type, points_recompense: s.points, objectif_description: s.titre, objectif_nombre: s.objectif, date_fin: '' });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!villeId || !form.titre || !form.description) return;
    setSaving(true);
    const { data, error } = await supabase.from('defis').insert({
      ville_id: villeId,
      titre: form.titre,
      description: form.description,
      type: form.type,
      points_recompense: form.points_recompense,
      objectif_description: form.objectif_description || form.titre,
      objectif_nombre: form.objectif_nombre,
      date_fin: form.date_fin || null,
    }).select().single();
    setSaving(false);
    if (!error && data) {
      setDefis((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ titre: '', description: '', type: 'exploration', points_recompense: 20, objectif_description: '', objectif_nombre: 1, date_fin: '' });
    }
  }

  if (isLoading) return <div className="min-h-screen pt-28 bg-creme flex items-center justify-center"><div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex gap-8">
          <MairieNav />
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-serif text-2xl font-bold text-texte">Défis citoyens</h1>
              <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors">
                <Plus size={16} /> Créer un défi
              </button>
            </div>

            {/* Suggestions rapides */}
            {!showForm && (
              <section className="mb-6">
                <p className="text-sm text-gray-500 mb-3">Suggestions de défis :</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => useSuggestion(s)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-bleu hover:text-bleu transition-colors">
                      {s.titre}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Formulaire */}
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-semibold text-texte">Nouveau défi</h2>
                      <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <input type="text" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Titre du défi" required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" required rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input type="number" value={form.points_recompense} onChange={(e) => setForm({ ...form, points_recompense: +e.target.value })} min={5} max={500} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Points" />
                        <input type="number" value={form.objectif_nombre} onChange={(e) => setForm({ ...form, objectif_nombre: +e.target.value })} min={1} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Objectif" />
                        <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <button type="submit" disabled={saving} className="px-6 py-2 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors disabled:opacity-50">
                        {saving ? 'Création...' : 'Créer le défi'}
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Liste des défis */}
            <div className="space-y-3">
              {defis.length === 0 ? (
                <div className="text-center py-12">
                  <Target size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aucun défi créé. Créez votre premier défi citoyen !</p>
                </div>
              ) : defis.map((d) => {
                const typeInfo = TYPES.find((t) => t.value === d.type) ?? TYPES[0];
                return (
                  <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-texte truncate">{d.titre}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{d.description}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={14} /> {d.participants_count}</span>
                      <span className="flex items-center gap-1 text-or font-bold"><Zap size={14} /> {d.points_recompense} pts</span>
                      <span className={d.actif ? 'text-vert font-bold' : 'text-red-400'}>{d.actif ? 'Actif' : 'Terminé'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
