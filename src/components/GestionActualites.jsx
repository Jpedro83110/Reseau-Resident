// src/components/GestionActualites.jsx
// Composant partagé : gestion actualités pour commerçants et associations
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Plus, Trash2, Eye, EyeOff, Pin, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  'Annonce', 'Promotion', 'Événement', 'Recrutement', 'Information', 'Autre',
];

export default function GestionActualites({ auteurType, auteurId, villeId }) {
  const [actualites, setActualites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    contenu: '',
    categorie: '',
    epingle: false,
  });

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

  useEffect(() => {
    chargerActualites();
  }, [auteurId]);

  async function chargerActualites() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('actualites')
        .select('id, titre, contenu, categorie, epingle, publie, created_at')
        .eq('auteur_type', auteurType)
        .eq('auteur_id', auteurId)
        .order('epingle', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActualites(data ?? []);
    } catch (err) {
      console.error('Erreur chargement actualités:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublier() {
    if (!form.titre.trim() || !form.contenu.trim()) return;
    try {
      setIsSaving(true);
      const { error } = await supabase.from('actualites').insert({
        ville_id: villeId,
        auteur_type: auteurType,
        auteur_id: auteurId,
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        categorie: form.categorie || null,
        epingle: form.epingle,
        publie: true,
      });
      if (error) throw error;
      setForm({ titre: '', contenu: '', categorie: '', epingle: false });
      setShowForm(false);
      await chargerActualites();
    } catch (err) {
      console.error('Erreur publication actualité:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePubblication(actu) {
    const { error } = await supabase
      .from('actualites')
      .update({ publie: !actu.publie })
      .eq('id', actu.id);
    if (!error) {
      setActualites((prev) => prev.map((a) => a.id === actu.id ? { ...a, publie: !a.publie } : a));
    }
  }

  async function toggleEpingle(actu) {
    const { error } = await supabase
      .from('actualites')
      .update({ epingle: !actu.epingle })
      .eq('id', actu.id);
    if (!error) {
      setActualites((prev) => prev.map((a) => a.id === actu.id ? { ...a, epingle: !a.epingle } : a));
    }
  }

  async function handleSupprimer(id) {
    if (!window.confirm('Supprimer cette actualité ?')) return;
    const { error } = await supabase.from('actualites').delete().eq('id', id);
    if (!error) setActualites((prev) => prev.filter((a) => a.id !== id));
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-texte">Mes actualités</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair transition-colors"
        >
          <Plus size={16} />
          Publier une actualité
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-bleu/5 border border-bleu/20 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-texte flex items-center gap-2">
            <Newspaper size={16} className="text-bleu" />
            Nouvelle actualité
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
              <input type="text" className={inputClass} value={form.titre}
                placeholder="ex: Nouveaux produits de saison disponibles !"
                onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
              <select className={inputClass} value={form.categorie}
                onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}>
                <option value="">-- Choisir --</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contenu *</label>
              <textarea rows={4} className={inputClass} value={form.contenu}
                placeholder="Rédigez votre actualité..."
                onChange={(e) => setForm((p) => ({ ...p, contenu: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.epingle}
                onChange={(e) => setForm((p) => ({ ...p, epingle: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-bleu focus:ring-bleu" />
              Épingler cette actualité (s'affiche en premier)
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={handlePublier} disabled={isSaving || !form.titre.trim() || !form.contenu.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors">
              {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Publier
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
        </div>
      ) : actualites.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Newspaper size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucune actualité publiée. Partagez des nouvelles avec les résidents !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actualites.map((actu) => (
            <motion.div
              key={actu.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl border p-4 transition-all ${actu.publie ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {actu.epingle && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-or/20 text-or">
                        <Pin size={10} />
                        Épinglée
                      </span>
                    )}
                    {actu.categorie && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {actu.categorie}
                      </span>
                    )}
                    {!actu.publie && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                        Masquée
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-texte text-sm">{actu.titre}</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{actu.contenu}</p>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Calendar size={11} />
                    {formatDate(actu.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleEpingle(actu)}
                    title={actu.epingle ? 'Désépingler' : 'Épingler'}
                    className={`p-2 rounded-lg transition-colors ${actu.epingle ? 'text-or bg-or/10' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'}`}>
                    <Pin size={14} />
                  </button>
                  <button onClick={() => togglePubblication(actu)}
                    title={actu.publie ? 'Masquer' : 'Publier'}
                    className="p-2 text-gray-400 hover:bg-gray-100 hover:text-texte rounded-lg transition-colors">
                    {actu.publie ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => handleSupprimer(actu.id)}
                    className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
