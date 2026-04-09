// src/pages/mairie/BackOfficeActualites.jsx
// CRUD complet des actualités de la ville pour le back-office mairie.
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper, Plus, Trash2, Eye, EyeOff, Pin, PenLine,
  X, MapPin, Image as ImageIcon, Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

const CATEGORIES = [
  'Information', 'Annonce', 'Événement', 'Culture', 'Travaux',
  'Sécurité', 'Social', 'Environnement', 'Sport', 'Autre',
];

// ── Modal formulaire ─────────────────────────────────────────
function ModalActualite({ actu, villeId, onClose, onSaved }) {
  const { showToast } = useToast();
  const isEdition = !!actu;
  const [form, setForm] = useState({
    titre: actu?.titre ?? '',
    contenu: actu?.contenu ?? '',
    categorie: actu?.categorie ?? '',
    publie: actu?.publie ?? true,
    epingle: actu?.epingle ?? false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(actu?.image_url ?? null);
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
    if (imagePreview && !actu?.image_url) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titre.trim() || !form.contenu.trim()) return;
    try {
      setIsSaving(true);
      setErreur(null);

      let image_url = actu?.image_url ?? null;

      // Upload si nouvelle image
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `actualites/mairie-${villeId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('actualites-images').upload(path, imageFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('actualites-images').getPublicUrl(path);
        image_url = urlData.publicUrl;
      } else if (!imagePreview) {
        image_url = null;
      }

      const payload = {
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        categorie: form.categorie || null,
        image_url,
        publie: form.publie,
        epingle: form.epingle,
      };

      if (isEdition) {
        const { error } = await supabase.from('actualites').update(payload).eq('id', actu.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('actualites').insert({
          ...payload,
          ville_id: villeId,
          auteur_type: 'mairie',
          auteur_id: villeId,
        });
        if (error) throw error;
      }

      onSaved();
      onClose();
      showToast({ type: 'success', message: isEdition ? 'Actualité modifiée' : 'Actualité publiée' });
    } catch (err) {
      console.error('Erreur sauvegarde actualité:', err);
      setErreur('Erreur lors de la sauvegarde.');
      showToast({ type: 'error', message: 'Erreur lors de la sauvegarde de l\'actualité' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={isEdition ? 'Modifier l\'actualité' : 'Nouvelle actualité'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-texte flex items-center gap-2">
            <Newspaper size={16} className="text-bleu" aria-hidden="true" />
            {isEdition ? 'Modifier l\'actualité' : 'Nouvelle actualité'}
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
              placeholder="ex: Travaux d'aménagement rue du Port"
              onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
            <select className={inputClass} value={form.categorie}
              onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}>
              <option value="">-- Choisir --</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contenu *</label>
            <textarea rows={5} className={inputClass} value={form.contenu}
              placeholder="Rédigez le contenu de l'actualité..."
              onChange={(e) => setForm((p) => ({ ...p, contenu: e.target.value }))} />
          </div>

          {/* Image */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image</label>
            {imagePreview ? (
              <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-200">
                <img loading="lazy" decoding="async" src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                <button type="button" onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-gray-600 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-bleu/50 transition-colors">
                <ImageIcon size={20} className="text-gray-300 mb-1" />
                <span className="text-xs text-gray-400">Ajouter une image (max 2 Mo)</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.publie}
                onChange={(e) => setForm((p) => ({ ...p, publie: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-bleu focus:ring-bleu" />
              Publiée
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.epingle}
                onChange={(e) => setForm((p) => ({ ...p, epingle: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-bleu focus:ring-bleu" />
              Épinglée
            </label>
          </div>

          {/* Erreur */}
          {erreur && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreur}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSaving || !form.titre.trim() || !form.contenu.trim()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors">
              {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isEdition ? 'Enregistrer' : 'Publier'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────
export default function BackOfficeActualites() {
  const { user } = useAuth();
  const { showToast } = useToast();
  usePageMeta('Mairie \u2014 Actualités');

  const [ville, setVille] = useState(null);
  const [actualites, setActualites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalActu, setModalActu] = useState(undefined); // undefined=fermé, null=nouveau, obj=édition

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
        await chargerActualites(v.id);
      } catch (err) {
        setError('Erreur de chargement.');
        console.error('Erreur BackOfficeActualites:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user]);

  async function chargerActualites(villeId) {
    const { data, error: qErr } = await supabase
      .from('actualites')
      .select('id, titre, contenu, categorie, image_url, epingle, publie, created_at')
      .eq('ville_id', villeId ?? ville?.id)
      .eq('auteur_type', 'mairie')
      .order('epingle', { ascending: false })
      .order('created_at', { ascending: false });
    if (qErr) throw qErr;
    setActualites(data ?? []);
  }

  async function togglePublie(actu) {
    const { error: e } = await supabase.from('actualites').update({ publie: !actu.publie }).eq('id', actu.id);
    if (!e) {
      setActualites((prev) => prev.map((a) => a.id === actu.id ? { ...a, publie: !a.publie } : a));
      showToast({ type: 'success', message: actu.publie ? 'Actualité masquée' : 'Actualité publiée' });
    } else {
      showToast({ type: 'error', message: 'Erreur lors du changement de statut' });
    }
  }

  async function toggleEpingle(actu) {
    const { error: e } = await supabase.from('actualites').update({ epingle: !actu.epingle }).eq('id', actu.id);
    if (!e) setActualites((prev) => prev.map((a) => a.id === actu.id ? { ...a, epingle: !a.epingle } : a));
  }

  async function supprimer(id) {
    if (!window.confirm('Supprimer cette actualité ?')) return;
    const { error: e } = await supabase.from('actualites').delete().eq('id', id);
    if (!e) {
      setActualites((prev) => prev.filter((a) => a.id !== id));
      showToast({ type: 'success', message: 'Actualité supprimée' });
    } else {
      showToast({ type: 'error', message: 'Erreur lors de la suppression' });
    }
  }

  function formatDate(str) {
    return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // ── Chargement / erreur ──
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

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-texte mb-1">{ville.nom}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            <MapPin size={14} /> Back-office actualités
          </p>
        </div>

        <div className="flex gap-8">
          <MairieNav />

          <main className="flex-1 min-w-0 space-y-6">
            {/* Barre d'action */}
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-texte">Actualités ({actualites.length})</h2>
              <button
                onClick={() => setModalActu(null)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair transition-colors"
              >
                <Plus size={16} />
                Nouvelle actualité
              </button>
            </div>

            {/* Tableau */}
            {actualites.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <Newspaper size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucune actualité. Publiez votre première actualité !</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header tableau — desktop uniquement */}
                <div className="hidden md:grid grid-cols-[1fr_100px_80px_80px_120px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <span>Titre</span>
                  <span>Date</span>
                  <span>Statut</span>
                  <span>Épingle</span>
                  <span className="text-right">Actions</span>
                </div>

                {/* Lignes */}
                {actualites.map((actu) => (
                  <div
                    key={actu.id}
                    className={`grid grid-cols-1 md:grid-cols-[1fr_100px_80px_80px_120px] gap-2 md:gap-3 px-5 py-3.5 border-b border-gray-50 items-center transition-colors hover:bg-gray-50/50 ${!actu.publie ? 'opacity-60' : ''}`}
                  >
                    {/* Titre + catégorie */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-texte truncate">{actu.titre}</p>
                      {actu.categorie && (
                        <span className="text-xs text-gray-400">{actu.categorie}</span>
                      )}
                    </div>

                    {/* Date */}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={11} className="hidden md:inline" />
                      {formatDate(actu.created_at)}
                    </span>

                    {/* Statut */}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                      actu.publie ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {actu.publie ? 'Publiée' : 'Masquée'}
                    </span>

                    {/* Épingle */}
                    <span className={`text-xs font-medium ${actu.epingle ? 'text-or' : 'text-gray-300'}`}>
                      {actu.epingle ? '📌 Oui' : '—'}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 md:justify-end">
                      <button onClick={() => setModalActu(actu)} title="Modifier"
                        className="p-2 text-gray-400 hover:text-bleu hover:bg-bleu/10 rounded-lg transition-colors">
                        <PenLine size={14} />
                      </button>
                      <button onClick={() => togglePublie(actu)} title={actu.publie ? 'Masquer' : 'Publier'}
                        className="p-2 text-gray-400 hover:text-texte hover:bg-gray-100 rounded-lg transition-colors">
                        {actu.publie ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => toggleEpingle(actu)} title={actu.epingle ? 'Désépingler' : 'Épingler'}
                        className={`p-2 rounded-lg transition-colors ${actu.epingle ? 'text-or bg-or/10' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}>
                        <Pin size={14} />
                      </button>
                      <button onClick={() => supprimer(actu.id)} title="Supprimer"
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalActu !== undefined && (
          <ModalActualite
            actu={modalActu}
            villeId={ville.id}
            onClose={() => setModalActu(undefined)}
            onSaved={() => chargerActualites(ville.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
