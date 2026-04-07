// src/components/GestionCampagnes.jsx
// Gestion des campagnes locales sponsorisées (commerçants premium)
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Trash2, Eye, EyeOff, Calendar, TrendingUp, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TYPES_CAMPAGNE = [
  { value: 'mise_en_avant', label: 'Mise en avant' },
  { value: 'notification_push', label: 'Notification push' },
  { value: 'banniere', label: 'Bannière promotionnelle' },
];

export default function GestionCampagnes({ commerceId, villeId, isPremium }) {
  const [campagnes, setCampagnes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    titre: '', description: '', type: 'mise_en_avant',
    date_debut: '', date_fin: '', budget: '',
  });

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

  useEffect(() => {
    chargerCampagnes();
  }, [commerceId]);

  async function chargerCampagnes() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campagnes')
        .select('id, titre, description, type, date_debut, date_fin, budget, statut, impressions, clics, created_at')
        .eq('commerce_id', commerceId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCampagnes(data ?? []);
    } catch (err) {
      console.error('Erreur chargement campagnes:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreer() {
    if (!form.titre.trim() || !form.date_debut || !form.date_fin) return;
    try {
      setIsSaving(true);
      const { error } = await supabase.from('campagnes').insert({
        commerce_id: commerceId,
        ville_id: villeId,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        type: form.type,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        budget: form.budget ? parseFloat(form.budget) : null,
        statut: 'active',
      });
      if (error) throw error;
      setForm({ titre: '', description: '', type: 'mise_en_avant', date_debut: '', date_fin: '', budget: '' });
      setShowForm(false);
      await chargerCampagnes();
    } catch (err) {
      console.error('Erreur création campagne:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSupprimer(id) {
    if (!window.confirm('Supprimer cette campagne ?')) return;
    const { error } = await supabase.from('campagnes').delete().eq('id', id);
    if (!error) setCampagnes((prev) => prev.filter((c) => c.id !== id));
  }

  if (!isPremium) {
    return (
      <div className="bg-gradient-to-r from-or/5 to-or-clair/5 border border-or/20 rounded-xl p-8 text-center">
        <Lock size={32} className="text-or/40 mx-auto mb-4" />
        <h3 className="font-serif text-lg font-bold text-texte mb-2">Campagnes locales</h3>
        <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
          Créez des campagnes sponsorisées pour booster votre visibilité auprès des résidents.
          Disponible avec l'abonnement Premium.
        </p>
        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-or/10 text-or text-sm font-medium rounded-lg">
          <Lock size={14} />
          Fonctionnalité Premium
        </span>
      </div>
    );
  }

  const statutLabels = {
    brouillon: { label: 'Brouillon', class: 'bg-gray-100 text-gray-600' },
    active: { label: 'Active', class: 'bg-emerald-50 text-emerald-700' },
    terminee: { label: 'Terminée', class: 'bg-gray-100 text-gray-500' },
  };
  const typeLabels = { mise_en_avant: 'Mise en avant', notification_push: 'Notification push', banniere: 'Bannière' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-texte">Campagnes locales</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-or text-white rounded-lg hover:bg-or-clair transition-colors"
        >
          <Plus size={16} />
          Nouvelle campagne
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-or/5 border border-or/20 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-texte flex items-center gap-2">
            <Megaphone size={16} className="text-or" />
            Créer une campagne
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
              <input type="text" className={inputClass} value={form.titre}
                placeholder="ex: Soldes d'été — 20% sur tout le magasin"
                onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select className={inputClass} value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                {TYPES_CAMPAGNE.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Budget (€)</label>
              <input type="number" min="0" className={inputClass} value={form.budget}
                placeholder="Optionnel"
                onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de début *</label>
              <input type="date" className={inputClass} value={form.date_debut}
                onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin *</label>
              <input type="date" className={inputClass} value={form.date_fin}
                onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea rows={2} className={inputClass} value={form.description}
                placeholder="Détails de la campagne..."
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleCreer} disabled={isSaving || !form.titre.trim() || !form.date_debut || !form.date_fin}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-or text-white rounded-lg hover:bg-or-clair disabled:opacity-60 transition-colors">
              {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Lancer la campagne
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-or border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campagnes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Megaphone size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucune campagne créée. Lancez votre première campagne pour booster votre visibilité !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campagnes.map((camp) => {
            const statut = statutLabels[camp.statut] ?? statutLabels.brouillon;
            return (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statut.class}`}>
                      {statut.label}
                    </span>
                    <span className="text-xs text-gray-400">{typeLabels[camp.type] ?? camp.type}</span>
                  </div>
                  <h4 className="font-semibold text-texte text-sm">{camp.titre}</h4>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(camp.date_debut).toLocaleDateString('fr-FR')} — {new Date(camp.date_fin).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <TrendingUp size={11} />
                      {camp.impressions ?? 0} vues · {camp.clics ?? 0} clics
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleSupprimer(camp.id)}
                  className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
