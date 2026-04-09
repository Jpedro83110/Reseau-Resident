// src/pages/commercant/components/GestionOffres.jsx
// CRUD offres avec suggestions intelligentes par catégorie
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, X, ToggleLeft, ToggleRight, Lightbulb, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';

const SUGGESTIONS = {
  'Restauration / Bar / Café': ['Menu du jour à -10%', 'Dessert offert pour 2 plats', 'Café offert le matin'],
  'Boulangerie / Pâtisserie': ['La 7ème baguette offerte', '-10% sur les viennoiseries avant 9h', 'Formule petit-déjeuner'],
  'Alimentation / Épicerie': ['-15% pour les résidents', 'Panier local à prix réduit', 'Livraison gratuite en ville'],
  'Mode / Beauté / Bien-être': ['-15% sur la 1ère prestation', 'Soin offert pour 3 prestations', 'Pack duo -20%'],
  'Maison / Décoration': ['-10% sur votre 1er achat', 'Conseil déco gratuit', 'Livraison offerte dès 50€'],
  'Loisirs / Culture': ['Cours d\'essai gratuit', '-20% sur l\'abonnement', 'Séance découverte offerte'],
  'Services': ['1ère consultation gratuite', '-20% sur le prochain RDV', 'Parrainage : -10% pour vous et votre filleul'],
};

const TYPES = [
  { value: 'reduction', label: 'Réduction' },
  { value: 'cadeau', label: 'Cadeau' },
  { value: 'offre_speciale', label: 'Offre spéciale' },
  { value: 'fidelite', label: 'Fidélité' },
];

export default function GestionOffres({ commerceId, categorie }) {
  const { showToast } = useToast();
  const [offres, setOffres] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titre: '', description: '', type: 'reduction', valeur: '', conditions: '', date_fin: '' });

  useEffect(() => {
    if (!commerceId) return;
    supabase.from('offres').select('id, titre, description, type, valeur, conditions, active, utilisations_count, date_fin, created_at')
      .eq('commerce_id', commerceId).order('created_at', { ascending: false })
      .then(({ data }) => { setOffres(data ?? []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [commerceId]);

  function useSuggestion(titre) {
    setForm({ ...form, titre, type: 'reduction' });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titre) return;
    setSaving(true);
    const { data, error } = await supabase.from('offres').insert({
      commerce_id: commerceId,
      titre: form.titre,
      description: form.description || null,
      type: form.type,
      valeur: form.valeur || null,
      conditions: form.conditions || null,
      date_fin: form.date_fin || null,
    }).select().single();
    setSaving(false);
    if (!error && data) {
      setOffres((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ titre: '', description: '', type: 'reduction', valeur: '', conditions: '', date_fin: '' });
      showToast({ type: 'success', message: 'Offre créée avec succès' });
    } else if (error) {
      showToast({ type: 'error', message: 'Erreur lors de la création de l\'offre' });
    }
  }

  async function toggleActive(id, active) {
    const { error: err } = await supabase.from('offres').update({ active: !active }).eq('id', id);
    if (!err) {
      setOffres((prev) => prev.map((o) => o.id === id ? { ...o, active: !active } : o));
      showToast({ type: 'success', message: active ? 'Offre désactivée' : 'Offre activée' });
    } else {
      showToast({ type: 'error', message: 'Erreur lors du changement de statut' });
    }
  }

  async function supprimer(id) {
    const { error: err } = await supabase.from('offres').delete().eq('id', id);
    if (!err) {
      setOffres((prev) => prev.filter((o) => o.id !== id));
      showToast({ type: 'success', message: 'Offre supprimée' });
    } else {
      showToast({ type: 'error', message: 'Erreur lors de la suppression' });
    }
  }

  const suggestions = SUGGESTIONS[categorie] ?? SUGGESTIONS['Services'] ?? [];

  if (isLoading) return <div className="text-center py-8"><div className="w-6 h-6 border-4 border-gray-200 border-t-bleu rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-texte">Mes offres ({offres.length})</h2>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors">
          <Plus size={14} /> Nouvelle offre
        </button>
      </div>

      {/* Suggestions intelligentes */}
      {!showForm && suggestions.length > 0 && (
        <div className="bg-or/5 rounded-xl border border-or/20 p-4">
          <p className="text-xs font-bold text-or flex items-center gap-1 mb-2"><Lightbulb size={14} /> Suggestions pour votre catégorie</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => useSuggestion(s)}
                className="px-3 py-1.5 bg-white border border-or/30 rounded-full text-xs text-gray-700 hover:border-or hover:text-or transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm text-texte">Nouvelle offre</h3>
                <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Titre de l'offre" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optionnel)" rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base resize-none" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2.5 text-base bg-white">
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input value={form.valeur} onChange={(e) => setForm({ ...form, valeur: e.target.value })} placeholder="Valeur (ex: -10%)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-base" />
                </div>
                <input value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="Conditions (optionnel)" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-base" />
                <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2.5 text-base" />
                <button type="submit" disabled={saving} className="px-5 py-2 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors disabled:opacity-50">
                  {saving ? 'Création...' : 'Créer l\'offre'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des offres */}
      {offres.length === 0 ? (
        <div className="text-center py-8">
          <Tag size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Aucune offre créée. Utilisez les suggestions ci-dessus !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {offres.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm text-texte truncate">{o.titre}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bleu/10 text-bleu">{TYPES.find((t) => t.value === o.type)?.label ?? o.type}</span>
                </div>
                {o.valeur && <p className="text-xs text-or font-bold">{o.valeur}</p>}
                <p className="text-[10px] text-gray-400 mt-0.5">{o.utilisations_count} utilisation{o.utilisations_count !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(o.id, o.active)} title={o.active ? 'Désactiver' : 'Activer'}>
                  {o.active ? <ToggleRight size={22} className="text-vert" /> : <ToggleLeft size={22} className="text-gray-300" />}
                </button>
                <button onClick={() => supprimer(o.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
