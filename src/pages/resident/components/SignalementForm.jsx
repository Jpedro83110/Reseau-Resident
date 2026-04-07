// src/pages/resident/components/SignalementForm.jsx
// Formulaire de signalement pour les résidents
import { useState } from 'react';
import { Send, Upload, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const CATEGORIES = [
  { value: 'voirie', label: 'Voirie' },
  { value: 'proprete', label: 'Propreté' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'bruit', label: 'Bruit' },
  { value: 'autre', label: 'Autre' },
];

export default function SignalementForm({ villeId, profileId, onSuccess }) {
  const [form, setForm] = useState({
    categorie: '',
    titre: '',
    description: '',
    adresse: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 2 Mo.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.categorie || !form.titre.trim()) {
      setError('Veuillez remplir la catégorie et le titre.');
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      let photo_url = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `signalements/${profileId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('signalements-photos').upload(path, photoFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('signalements-photos').getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

      const { error: insertErr } = await supabase.from('signalements').insert({
        ville_id: villeId,
        auteur_id: profileId,
        categorie: form.categorie,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        adresse: form.adresse.trim() || null,
        photo_url,
        statut: 'ouvert',
      });

      if (insertErr) throw insertErr;

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (err) {
      console.error('Erreur signalement:', err);
      setError('Erreur lors de l\'envoi du signalement.');
    } finally {
      setIsSending(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <Send size={20} className="text-emerald-600" />
        </div>
        <p className="font-semibold text-texte">Signalement envoyé !</p>
        <p className="text-sm text-gray-500 mt-1">La mairie sera informée de votre signalement.</p>
      </div>
    );
  }

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Catégorie */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie *</label>
        <select
          value={form.categorie}
          onChange={(e) => setForm({ ...form, categorie: e.target.value })}
          className={inputClass}
        >
          <option value="">-- Choisir --</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Titre */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Titre *</label>
        <input
          type="text"
          value={form.titre}
          onChange={(e) => setForm({ ...form, titre: e.target.value })}
          className={inputClass}
          placeholder="Ex : Nid de poule rue de la Mairie"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="Décrivez le problème..."
        />
      </div>

      {/* Adresse */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Adresse (optionnel)</label>
        <input
          type="text"
          value={form.adresse}
          onChange={(e) => setForm({ ...form, adresse: e.target.value })}
          className={inputClass}
          placeholder="Ex : 12 rue de la République"
        />
      </div>

      {/* Photo */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Photo (optionnel)</label>
        {photoPreview ? (
          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-200">
            <img loading="lazy" decoding="async" src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={removePhoto}
              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-gray-600 hover:text-red-500 transition-colors"
              aria-label="Retirer la photo"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-bleu/50 transition-colors">
            <Upload size={18} className="text-gray-300 mb-1" />
            <span className="text-xs text-gray-400">Ajouter une photo (max 2 Mo)</span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSending || !form.categorie || !form.titre.trim()}
        className="flex items-center justify-center gap-2 w-full px-5 py-2.5 text-sm font-medium bg-bleu text-white rounded-lg hover:bg-bleu-clair disabled:opacity-60 transition-colors"
      >
        {isSending ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send size={14} />
        )}
        {isSending ? 'Envoi en cours...' : 'Envoyer le signalement'}
      </button>
    </form>
  );
}
