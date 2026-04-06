// src/pages/commercant/components/PublierActualite.jsx
// Formulaire pour qu'un commerçant publie une actualité avec image.
import { useState } from 'react';
import { Newspaper, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const CATEGORIES = [
  'Annonce', 'Promotion', 'Événement', 'Recrutement', 'Information', 'Autre',
];

export default function PublierActualite({ commerceId, villeId, onPublie }) {
  const [form, setForm] = useState({
    titre: '',
    contenu: '',
    categorie: '',
    epingle: false,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(false);

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErreur('L\'image ne doit pas dépasser 2 Mo.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErreur(null);
  }

  function removeImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titre.trim() || !form.contenu.trim()) return;

    try {
      setIsSaving(true);
      setErreur(null);

      let image_url = null;

      // Upload image si présente
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `actualites/${commerceId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('actualites-images')
          .upload(path, imageFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('actualites-images')
          .getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      // Insérer l'actualité
      const { error: insertError } = await supabase.from('actualites').insert({
        ville_id: villeId,
        auteur_type: 'commerce',
        auteur_id: commerceId,
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        categorie: form.categorie || null,
        image_url,
        epingle: form.epingle,
        publie: true,
      });

      if (insertError) throw insertError;

      // Reset
      setForm({ titre: '', contenu: '', categorie: '', epingle: false });
      removeImage();
      setSucces(true);
      setTimeout(() => setSucces(false), 3000);
      onPublie?.();
    } catch (err) {
      console.error('Erreur publication actualité:', err);
      setErreur('Erreur lors de la publication. Réessayez.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bleu/5 border border-bleu/20 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-texte flex items-center gap-2">
        <Newspaper size={16} className="text-bleu" />
        Publier une actualité
      </h3>

      {/* Titre */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
        <input
          type="text"
          className={inputClass}
          value={form.titre}
          placeholder="ex: Nouveaux produits de saison disponibles !"
          onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
        />
      </div>

      {/* Catégorie */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
        <select
          className={inputClass}
          value={form.categorie}
          onChange={(e) => setForm((p) => ({ ...p, categorie: e.target.value }))}
        >
          <option value="">-- Choisir --</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Contenu */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contenu *</label>
        <textarea
          rows={5}
          className={inputClass}
          value={form.contenu}
          placeholder="Rédigez votre actualité..."
          onChange={(e) => setForm((p) => ({ ...p, contenu: e.target.value }))}
        />
      </div>

      {/* Image */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Image (optionnel)</label>
        {imagePreview ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
            <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-gray-600 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-bleu/50 transition-colors">
            <ImageIcon size={24} className="text-gray-300 mb-1" />
            <span className="text-xs text-gray-400">Cliquez pour ajouter une image (max 2 Mo)</span>
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        )}
      </div>

      {/* Épingler */}
      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
        <input
          type="checkbox"
          checked={form.epingle}
          onChange={(e) => setForm((p) => ({ ...p, epingle: e.target.checked }))}
          className="w-4 h-4 rounded border-gray-300 text-bleu focus:ring-bleu"
        />
        Épingler cette actualité (s'affiche en premier)
      </label>

      {/* Messages */}
      {erreur && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erreur}</p>
      )}
      {succes && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Actualité publiée avec succès !
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isSaving || !form.titre.trim() || !form.contenu.trim()}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors"
        >
          {isSaving && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Publier
        </button>
      </div>
    </form>
  );
}
