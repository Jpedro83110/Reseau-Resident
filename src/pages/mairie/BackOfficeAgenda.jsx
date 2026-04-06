// src/pages/mairie/BackOfficeAgenda.jsx
// CRUD complet des événements territoriaux pour le back-office mairie.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Plus, Trash2, PenLine, X, MapPin,
  Clock, Tag, Globe, Image as ImageIcon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

const CATEGORIES = [
  'Concert / Spectacle', 'Atelier', 'Sport', 'Marché / Brocante', 'Festival',
  'Conférence', 'Portes ouvertes', 'Animation jeunesse', 'Collecte',
  'Cérémonie', 'Réunion publique', 'Autre',
];

const STATUTS = {
  brouillon: { label: 'Brouillon', bg: 'bg-gray-100',     text: 'text-gray-600' },
  publie:    { label: 'Publié',    bg: 'bg-emerald-50',   text: 'text-emerald-700' },
  annule:    { label: 'Annulé',    bg: 'bg-red-50',       text: 'text-red-600' },
  termine:   { label: 'Terminé',   bg: 'bg-gray-100',     text: 'text-gray-500' },
};

// ── Modal formulaire ─────────────────────────────────────────
function ModalEvenement({ evt, villeId, onClose, onSaved }) {
  const isEdition = !!evt;
  const [form, setForm] = useState({
    titre: evt?.titre ?? '',
    description: evt?.description ?? '',
    lieu: evt?.lieu ?? '',
    adresse: evt?.adresse ?? '',
    date_debut: evt?.date_debut ? evt.date_debut.slice(0, 10) : '',
    heure_debut: evt?.date_debut ? evt.date_debut.slice(11, 16) : '',
    date_fin: evt?.date_fin ? evt.date_fin.slice(0, 10) : '',
    categorie: evt?.categorie ?? '',
    gratuit: evt?.gratuit ?? true,
    prix: evt?.prix ?? '',
    lien_externe: evt?.lien_externe ?? '',
    statut: evt?.statut ?? 'publie',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(evt?.image_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [erreur, setErreur] = useState(null);

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErreur('Image : 2 Mo maximum.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErreur(null);
  }

  function removeImage() {
    setImageFile(null);
    if (imagePreview && !evt?.image_url) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titre.trim() || !form.date_debut) return;
    try {
      setIsSaving(true);
      setErreur(null);

      let image_url = evt?.image_url ?? null;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `evenements/mairie-${villeId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('actualites-images').upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('actualites-images').getPublicUrl(path);
        image_url = urlData.publicUrl;
      } else if (!imagePreview) {
        image_url = null;
      }

      const dateDebut = form.heure_debut
        ? `${form.date_debut}T${form.heure_debut}:00`
        : `${form.date_debut}T00:00:00`;

      const payload = {
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
        image_url,
        statut: form.statut,
      };

      if (isEdition) {
        const { error } = await supabase.from('evenements').update(payload).eq('id', evt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('evenements').insert({
          ...payload,
          ville_id: villeId,
          organisateur_type: 'mairie',
          organisateur_id: villeId,
        });
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde événement:', err);
      setErreur('Erreur lors de la sauvegarde.');
    } finally {
      setIsSaving(false);
    }
  }

  // Fermer avec Escape
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={isEdition ? 'Modifier l\'événement' : 'Nouvel événement'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-texte flex items-center gap-2">
            <Calendar size={16} className="text-bleu" aria-hidden="true" />
            {isEdition ? 'Modifier l\'événement' : 'Nouvel événement'}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
            <input type="text" className={inputClass} value={form.titre}
              placeholder="ex: Fête de la musique 2026"
              onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date début *</label>
              <input type="date" className={inputClass} value={form.date_debut}
                onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Heure</label>
              <input type="time" className={inputClass} value={form.heure_debut}
                onChange={(e) => setForm((p) => ({ ...p, heure_debut: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
            <input type="date" className={inputClass} value={form.date_fin}
              onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))} />
          </div>

          {/* Lieu + adresse */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lieu</label>
              <input type="text" className={inputClass} value={form.lieu}
                placeholder="ex: Place de la Mairie"
                onChange={(e) => setForm((p) => ({ ...p, lieu: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
              <input type="text" className={inputClass} value={form.adresse}
                placeholder="ex: 1 place de la Mairie"
                onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))} />
            </div>
          </div>

          {/* Catégorie + statut */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
              <select className={inputClass} value={form.categorie}
                onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}>
                <option value="">-- Choisir --</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select className={inputClass} value={form.statut}
                onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value }))}>
                <option value="publie">Publié</option>
                <option value="brouillon">Brouillon</option>
                <option value="annule">Annulé</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
          </div>

          {/* Tarif */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarif</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={form.gratuit} onChange={() => setForm((p) => ({ ...p, gratuit: true, prix: '' }))} />
                Gratuit
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={!form.gratuit} onChange={() => setForm((p) => ({ ...p, gratuit: false }))} />
                Payant
              </label>
              {!form.gratuit && (
                <input type="number" min="0" step="0.01" placeholder="Prix €" value={form.prix}
                  onChange={(e) => setForm((p) => ({ ...p, prix: e.target.value }))}
                  className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-bleu outline-none" />
              )}
            </div>
          </div>

          {/* Lien externe */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lien externe</label>
            <input type="url" className={inputClass} value={form.lien_externe}
              placeholder="https://..."
              onChange={(e) => setForm((p) => ({ ...p, lien_externe: e.target.value }))} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea rows={3} className={inputClass} value={form.description}
              placeholder="Décrivez l'événement..."
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image</label>
            {imagePreview ? (
              <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-200">
                <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                <button type="button" onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-gray-600 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-bleu/50 transition-colors">
                <ImageIcon size={20} className="text-gray-300 mb-1" />
                <span className="text-xs text-gray-400">Ajouter une image (max 2 Mo)</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {erreur && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreur}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSaving || !form.titre.trim() || !form.date_debut}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors">
              {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEdition ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Vue calendrier simple ────────────────────────────────────
function VueCalendrier({ evenements }) {
  const [moisOffset, setMoisOffset] = useState(0);
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  const now = new Date();
  const annee = new Date(now.getFullYear(), now.getMonth() + moisOffset, 1).getFullYear();
  const mois = new Date(now.getFullYear(), now.getMonth() + moisOffset, 1).getMonth();
  const premierJour = new Date(annee, mois, 1);
  const dernierJour = new Date(annee, mois + 1, 0);
  const debutSemaine = (premierJour.getDay() + 6) % 7; // Lundi = 0

  // Événements du mois
  const evtDuMois = evenements.filter((evt) => {
    const d = new Date(evt.date_debut);
    return d.getMonth() === mois && d.getFullYear() === annee;
  });

  const jourAvecEvt = new Set(evtDuMois.map((e) => new Date(e.date_debut).getDate()));

  const cellules = [];
  for (let i = 0; i < debutSemaine; i++) cellules.push(null);
  for (let j = 1; j <= dernierJour.getDate(); j++) cellules.push(j);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMoisOffset((o) => o - 1)} className="p-1.5 text-gray-400 hover:text-texte hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h3 className="font-semibold text-texte text-sm">
          {MOIS_FR[mois]} {annee}
        </h3>
        <button onClick={() => setMoisOffset((o) => o + 1)} className="p-1.5 text-gray-400 hover:text-texte hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {JOURS.map((j) => (
          <span key={j} className="text-[10px] font-medium text-gray-400 py-1">{j}</span>
        ))}
        {cellules.map((jour, i) => (
          <div
            key={i}
            className={`h-8 flex items-center justify-center rounded-lg text-xs ${
              jour === null
                ? ''
                : jourAvecEvt.has(jour)
                  ? 'bg-bleu text-white font-bold'
                  : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {jour}
          </div>
        ))}
      </div>

      {/* Légende */}
      {evtDuMois.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
          {evtDuMois.slice(0, 5).map((evt) => (
            <div key={evt.id} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-bleu shrink-0" />
              <span className="font-medium">{new Date(evt.date_debut).getDate()}</span>
              <span className="truncate">{evt.titre}</span>
            </div>
          ))}
          {evtDuMois.length > 5 && (
            <p className="text-[10px] text-gray-400">+{evtDuMois.length - 5} autre{evtDuMois.length - 5 > 1 ? 's' : ''}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────
export default function BackOfficeAgenda() {
  const { user } = useAuth();
  usePageMeta('Mairie \u2014 Agenda');

  const [ville, setVille] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalEvt, setModalEvt] = useState(undefined);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    async function charger() {
      try {
        setIsLoading(true);
        const { data: profil } = await supabase.from('mairie_profiles').select('ville_id').eq('id', user.id).maybeSingle();
        if (!profil?.ville_id) { setError('Aucune ville associée.'); return; }
        const { data: v } = await supabase.from('villes').select('id, nom').eq('id', profil.ville_id).maybeSingle();
        if (!v) { setError('Ville introuvable.'); return; }
        setVille(v);
        await chargerEvenements(v.id);
      } catch (err) {
        setError('Erreur de chargement.');
        console.error('Erreur BackOfficeAgenda:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user]);

  async function chargerEvenements(villeId) {
    const { data, error: qErr } = await supabase
      .from('evenements')
      .select('id, titre, description, lieu, adresse, date_debut, date_fin, categorie, gratuit, prix, lien_externe, image_url, statut, created_at')
      .eq('ville_id', villeId ?? ville?.id)
      .order('date_debut', { ascending: false });
    if (qErr) throw qErr;
    setEvenements(data ?? []);
  }

  async function supprimer(id) {
    if (!window.confirm('Supprimer cet événement ?')) return;
    const { error: e } = await supabase.from('evenements').delete().eq('id', id);
    if (!e) setEvenements((prev) => prev.filter((evt) => evt.id !== id));
  }

  function formatDate(str) {
    if (!str) return '';
    return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatHeure(str) {
    if (!str) return '';
    const d = new Date(str);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return '';
    return `${String(h).padStart(2, '0')}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-4">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-24 lg:pb-12 bg-creme">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-texte mb-1">{ville.nom}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            <MapPin size={14} /> Agenda territorial
          </p>
        </div>

        <div className="flex gap-8">
          <MairieNav />

          <main className="flex-1 min-w-0 space-y-6">
            {/* Barre d'action */}
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-texte">Événements ({evenements.length})</h2>
              <button
                onClick={() => setModalEvt(null)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair transition-colors"
              >
                <Plus size={16} />
                Nouvel événement
              </button>
            </div>

            {/* Calendrier + tableau */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
              {/* Tableau */}
              <div>
                {evenements.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                    <Calendar size={36} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Aucun événement. Créez votre premier événement !</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Header — desktop */}
                    <div className="hidden md:grid grid-cols-[1fr_110px_100px_80px_100px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      <span>Titre</span>
                      <span>Date</span>
                      <span>Lieu</span>
                      <span>Statut</span>
                      <span className="text-right">Actions</span>
                    </div>

                    {evenements.map((evt) => {
                      const statut = STATUTS[evt.statut] ?? STATUTS.brouillon;
                      return (
                        <div
                          key={evt.id}
                          className="grid grid-cols-1 md:grid-cols-[1fr_110px_100px_80px_100px] gap-2 md:gap-3 px-5 py-3.5 border-b border-gray-50 items-center hover:bg-gray-50/50 transition-colors"
                        >
                          {/* Titre + catégorie */}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-texte truncate">{evt.titre}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {evt.categorie && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Tag size={10} />{evt.categorie}
                                </span>
                              )}
                              <span className={`text-xs font-medium ${evt.gratuit ? 'text-emerald-600' : 'text-or'}`}>
                                {evt.gratuit ? 'Gratuit' : `${evt.prix ?? '?'}€`}
                              </span>
                            </div>
                          </div>

                          {/* Date */}
                          <div className="text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="hidden md:inline" />
                              {formatDate(evt.date_debut)}
                            </span>
                            {formatHeure(evt.date_debut) && (
                              <span className="text-gray-400">{formatHeure(evt.date_debut)}</span>
                            )}
                          </div>

                          {/* Lieu */}
                          <span className="text-xs text-gray-500 truncate flex items-center gap-1">
                            {evt.lieu && <><MapPin size={10} className="shrink-0 hidden md:inline" />{evt.lieu}</>}
                          </span>

                          {/* Statut */}
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium w-fit ${statut.bg} ${statut.text}`}>
                            {statut.label}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 md:justify-end">
                            <button onClick={() => setModalEvt(evt)} title="Modifier"
                              className="p-2 text-gray-400 hover:text-bleu hover:bg-bleu/10 rounded-lg transition-colors">
                              <PenLine size={14} />
                            </button>
                            <button onClick={() => supprimer(evt.id)} title="Supprimer"
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Calendrier */}
              <VueCalendrier evenements={evenements} />
            </div>
          </main>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalEvt !== undefined && (
          <ModalEvenement
            evt={modalEvt}
            villeId={ville.id}
            onClose={() => setModalEvt(undefined)}
            onSaved={() => chargerEvenements(ville.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
