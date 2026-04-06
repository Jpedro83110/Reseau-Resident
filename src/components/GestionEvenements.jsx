// src/components/GestionEvenements.jsx
// Composant partagé : gestion événements pour commerçants et associations
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, Trash2, MapPin, Clock, Tag, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  'Concert / Spectacle', 'Atelier', 'Sport', 'Marché / Brocante', 'Festival',
  'Conférence', 'Portes ouvertes', 'Animation jeunesse', 'Collecte', 'Autre',
];

export default function GestionEvenements({ organisateurType, organisateurId, villeId }) {
  const [evenements, setEvenements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    description: '',
    lieu: '',
    adresse: '',
    date_debut: '',
    heure_debut: '',
    date_fin: '',
    categorie: '',
    gratuit: true,
    prix: '',
    lien_externe: '',
  });

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

  useEffect(() => {
    chargerEvenements();
  }, [organisateurId]);

  async function chargerEvenements() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, description, lieu, adresse, date_debut, date_fin, categorie, gratuit, prix, statut, created_at')
        .eq('organisateur_type', organisateurType)
        .eq('organisateur_id', organisateurId)
        .order('date_debut', { ascending: false });
      if (error) throw error;
      setEvenements(data ?? []);
    } catch (err) {
      console.error('Erreur chargement événements:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreer() {
    if (!form.titre.trim() || !form.date_debut) return;
    try {
      setIsSaving(true);
      const dateDebut = form.heure_debut
        ? `${form.date_debut}T${form.heure_debut}:00`
        : `${form.date_debut}T00:00:00`;

      const { error } = await supabase.from('evenements').insert({
        ville_id: villeId,
        organisateur_type: organisateurType,
        organisateur_id: organisateurId,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        lieu: form.lieu.trim() || null,
        adresse: form.adresse.trim() || null,
        date_debut: dateDebut,
        date_fin: form.date_fin ? `${form.date_fin}T23:59:00` : null,
        categorie: form.categorie || null,
        gratuit: form.gratuit,
        prix: !form.gratuit && form.prix ? parseFloat(form.prix) : null,
        lien_externe: form.lien_externe.trim() || null,
        statut: 'publie',
      });
      if (error) throw error;

      setForm({
        titre: '', description: '', lieu: '', adresse: '', date_debut: '',
        heure_debut: '', date_fin: '', categorie: '', gratuit: true, prix: '', lien_externe: '',
      });
      setShowForm(false);
      await chargerEvenements();
    } catch (err) {
      console.error('Erreur création événement:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSupprimer(id) {
    if (!window.confirm('Supprimer cet événement ?')) return;
    const { error } = await supabase.from('evenements').delete().eq('id', id);
    if (!error) setEvenements((prev) => prev.filter((e) => e.id !== id));
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  const statutClass = {
    publie: 'bg-emerald-50 text-emerald-700',
    brouillon: 'bg-gray-100 text-gray-600',
    annule: 'bg-red-50 text-red-600',
    termine: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-bold text-texte">Mes événements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair transition-colors"
        >
          <Plus size={16} />
          Nouvel événement
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-bleu/5 border border-bleu/20 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-texte flex items-center gap-2">
            <Calendar size={16} className="text-bleu" />
            Créer un événement
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
              <input type="text" className={inputClass} value={form.titre}
                placeholder="ex: Portes ouvertes de printemps"
                onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de début *</label>
              <input type="date" className={inputClass} value={form.date_debut}
                onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Heure</label>
              <input type="time" className={inputClass} value={form.heure_debut}
                onChange={(e) => setForm((p) => ({ ...p, heure_debut: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin</label>
              <input type="date" className={inputClass} value={form.date_fin}
                onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))} />
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Lieu</label>
              <input type="text" className={inputClass} value={form.lieu}
                placeholder="ex: Salle des fêtes"
                onChange={(e) => setForm((p) => ({ ...p, lieu: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
              <input type="text" className={inputClass} value={form.adresse}
                placeholder="ex: 12 rue de la République"
                onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tarif</label>
              <div className="flex items-center gap-3 h-10">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio" name="gratuit" checked={form.gratuit}
                    onChange={() => setForm((p) => ({ ...p, gratuit: true, prix: '' }))} />
                  Gratuit
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                  <input type="radio" name="gratuit" checked={!form.gratuit}
                    onChange={() => setForm((p) => ({ ...p, gratuit: false }))} />
                  Payant
                </label>
                {!form.gratuit && (
                  <input type="number" min="0" step="0.01" placeholder="Prix €" value={form.prix}
                    onChange={(e) => setForm((p) => ({ ...p, prix: e.target.value }))}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-bleu outline-none" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lien externe</label>
              <input type="url" className={inputClass} value={form.lien_externe}
                placeholder="https://..."
                onChange={(e) => setForm((p) => ({ ...p, lien_externe: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea rows={2} className={inputClass} value={form.description}
                placeholder="Décrivez votre événement..."
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleCreer} disabled={isSaving || !form.titre.trim() || !form.date_debut}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors">
              {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Publier l'événement
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
        </div>
      ) : evenements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Calendar size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Aucun événement créé pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evenements.map((evt) => (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statutClass[evt.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                    {evt.statut === 'publie' ? 'Publié' : evt.statut}
                  </span>
                  {evt.categorie && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Tag size={11} />
                      {evt.categorie}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-texte text-sm">{evt.titre}</h4>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={11} />
                    {formatDate(evt.date_debut)}
                  </span>
                  {evt.lieu && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={11} />
                      {evt.lieu}
                    </span>
                  )}
                  <span className={`text-xs font-medium ${evt.gratuit ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {evt.gratuit ? 'Gratuit' : `${evt.prix ?? '?'}€`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleSupprimer(evt.id)}
                className="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
