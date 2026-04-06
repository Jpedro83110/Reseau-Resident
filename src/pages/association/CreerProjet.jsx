// src/pages/association/CreerProjet.jsx
// Formulaire complet pour créer un projet associatif avec paliers et image.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plus, X, Target, Upload, Eye, EyeOff, Image as ImageIcon,
  FolderOpen, Calendar, TrendingUp, Save,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none transition-colors';

const PALIER_EXEMPLES = [
  { montant: '100', description: '10 ballons de compétition' },
  { montant: '250', description: '1 déplacement en car pour un match' },
  { montant: '500', description: '20 maillots floqués pour l\'équipe' },
];

export default function CreerProjet() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  usePageMeta('Créer un projet');

  const [association, setAssociation] = useState(null);
  const [isLoadingAsso, setIsLoadingAsso] = useState(true);

  const [form, setForm] = useState({
    titre: '',
    description: '',
    objectif_montant: '',
    objectif_description: '',
    date_limite: '',
  });
  const [paliers, setPaliers] = useState([{ montant: '', description: '' }]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Charger l'association
  useEffect(() => {
    if (!user) { setIsLoadingAsso(false); return; }
    async function charger() {
      try {
        const { data: profil } = await supabase
          .from('association_profiles')
          .select('association_id')
          .eq('id', user.id)
          .maybeSingle();
        if (!profil?.association_id) return;

        const { data } = await supabase
          .from('associations')
          .select('id, nom, ville_id, logo_url')
          .eq('id', profil.association_id)
          .maybeSingle();
        if (data) setAssociation(data);
      } catch (err) {
        console.error('Erreur chargement association:', err);
      } finally {
        setIsLoadingAsso(false);
      }
    }
    charger();
  }, [user]);

  // Preview image locale
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  }

  // Paliers
  function ajouterPalier() {
    setPaliers((prev) => [...prev, { montant: '', description: '' }]);
  }

  function supprimerPalier(i) {
    setPaliers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function setPalierVal(i, champ, val) {
    setPaliers((prev) => prev.map((p, idx) => idx === i ? { ...p, [champ]: val } : p));
  }

  // Upload image vers Supabase Storage
  async function uploadImage() {
    if (!imageFile) return null;
    const ext = imageFile.name.split('.').pop();
    const path = `${association.id}/${Date.now()}.${ext}`;
    const { data, error: uploadError } = await supabase.storage
      .from('projets-images')
      .upload(path, imageFile, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = supabase.storage
      .from('projets-images')
      .getPublicUrl(data.path);
    return publicUrl.publicUrl;
  }

  // Soumission
  async function handleSubmit(statut) {
    if (!form.titre.trim() || !form.description.trim()) {
      setError('Le titre et la description sont obligatoires.');
      return;
    }
    if (!association) {
      setError('Association introuvable.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Upload image si présente
      let imageUrl = null;
      try {
        imageUrl = await uploadImage();
      } catch (err) {
        console.error('Erreur upload image:', err);
        // On continue sans image
      }

      // Préparer les paliers valides
      const paliersValides = paliers
        .filter((p) => p.montant && p.description.trim())
        .map((p) => ({ montant: parseFloat(p.montant), description: p.description.trim() }))
        .sort((a, b) => a.montant - b.montant);

      const { data, error: insertError } = await supabase
        .from('projets')
        .insert({
          association_id: association.id,
          ville_id: association.ville_id,
          titre: form.titre.trim(),
          description: form.description.trim(),
          objectif_montant: form.objectif_montant ? parseFloat(form.objectif_montant) : null,
          objectif_description: form.objectif_description.trim() || null,
          date_limite: form.date_limite || null,
          paliers: paliersValides.length > 0 ? paliersValides : null,
          image_url: imageUrl,
          statut,
          source: 'local',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      navigate(`/mon-association/projets/${data.id}`);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
      console.error('Erreur création projet:', err);
    } finally {
      setIsSaving(false);
    }
  }

  // Calcul progression preview
  const progressionPreview = form.objectif_montant
    ? Math.min(100, Math.round((0 / parseFloat(form.objectif_montant)) * 100))
    : 0;

  if (isLoadingAsso) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Preview ──
  if (isPreview) {
    return (
      <div className="min-h-screen pt-28 pb-24 bg-creme">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <button
            onClick={() => setIsPreview(false)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-texte mb-6 transition-colors"
          >
            <EyeOff size={16} />
            Quitter la preview
          </button>

          {/* Image hero */}
          {imagePreviewUrl ? (
            <div className="h-56 md:h-72 rounded-2xl overflow-hidden mb-6">
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-40 rounded-2xl bg-gradient-to-br from-bleu/10 to-bleu/5 flex items-center justify-center mb-6">
              <ImageIcon size={40} className="text-bleu/20" />
            </div>
          )}

          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 mb-3">
            Aperçu
          </span>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">
            {form.titre || 'Titre du projet'}
          </h1>
          {association && (
            <p className="text-sm text-gray-500 mb-4">{association.nom}</p>
          )}
          <p className="text-gray-600 whitespace-pre-line mb-6">
            {form.description || 'Description du projet...'}
          </p>

          {/* Progression */}
          {form.objectif_montant && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-texte">0€ collectés</span>
                <span className="text-gray-400">sur {parseFloat(form.objectif_montant).toLocaleString('fr-FR')}€</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-bleu rounded-full" style={{ width: `${progressionPreview}%` }} />
              </div>
            </div>
          )}

          {/* Paliers preview */}
          {paliers.some((p) => p.montant && p.description) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <h3 className="font-semibold text-texte flex items-center gap-2 mb-4">
                <Target size={16} className="text-bleu" />
                Paliers de soutien
              </h3>
              <div className="space-y-3">
                {paliers.filter((p) => p.montant && p.description).map((p, i) => (
                  <div key={i} className="flex items-center gap-4 pl-3 border-l-3 border-gray-200">
                    <span className="text-lg font-bold text-bleu w-20 shrink-0">{p.montant}€</span>
                    <span className="text-sm text-gray-600">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setIsPreview(false)}
              className="px-5 py-2.5 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Retour à l'édition
            </button>
            <button
              onClick={() => { setIsPreview(false); handleSubmit('actif'); }}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-bleu text-white rounded-xl hover:bg-bleu-clair disabled:opacity-60 transition-colors"
            >
              Publier le projet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire ──
  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Retour */}
        <button
          onClick={() => navigate('/mon-association')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-texte mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour au dashboard
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-texte mb-2">
            Créer un nouveau projet
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Décrivez votre projet et définissez des paliers concrets pour mobiliser les soutiens.
          </p>

          <div className="space-y-8">
            {/* ── Informations principales ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <h2 className="font-semibold text-texte flex items-center gap-2">
                <FolderOpen size={18} className="text-bleu" />
                Informations du projet
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre du projet *</label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.titre}
                  placeholder="ex: Achat de matériel sportif pour les jeunes"
                  onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description détaillée *</label>
                <textarea
                  rows={5}
                  className={inputClass}
                  value={form.description}
                  placeholder="Expliquez votre projet, son impact pour la communauté locale, et comment les fonds seront utilisés..."
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <TrendingUp size={14} />
                    Objectif financier (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={form.objectif_montant}
                    placeholder="ex: 500"
                    onChange={(e) => setForm((p) => ({ ...p, objectif_montant: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar size={14} />
                    Date limite
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    value={form.date_limite}
                    onChange={(e) => setForm((p) => ({ ...p, date_limite: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description de l'objectif</label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.objectif_description}
                  placeholder="ex: Acheter 20 maillots floqués pour l'équipe U12"
                  onChange={(e) => setForm((p) => ({ ...p, objectif_description: e.target.value }))}
                />
              </div>
            </div>

            {/* ── Image ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-texte flex items-center gap-2">
                <ImageIcon size={18} className="text-bleu" />
                Image du projet
              </h2>

              {imagePreviewUrl ? (
                <div className="relative">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-lg shadow-md text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-bleu hover:bg-bleu/5 transition-colors">
                  <Upload size={28} className="text-gray-300 mb-2" />
                  <span className="text-sm text-gray-500 font-medium">Cliquer pour ajouter une image</span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG — 5 Mo max</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* ── Paliers ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-texte flex items-center gap-2">
                  <Target size={18} className="text-bleu" />
                  Paliers de soutien
                </h2>
                <button
                  onClick={ajouterPalier}
                  className="flex items-center gap-1.5 text-xs text-bleu hover:text-bleu-clair font-bold transition-colors"
                >
                  <Plus size={14} />
                  Ajouter un palier
                </button>
              </div>

              <p className="text-xs text-gray-400">
                Les paliers permettent aux résidents de visualiser concrètement l'impact de leur soutien.
              </p>

              <div className="space-y-3">
                {paliers.map((palier, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-28 shrink-0">
                      <input
                        type="number"
                        min="0"
                        placeholder={PALIER_EXEMPLES[i]?.montant ?? 'Montant €'}
                        value={palier.montant}
                        onChange={(e) => setPalierVal(i, 'montant', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-bleu outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder={PALIER_EXEMPLES[i]?.description ?? 'Description concrète du palier'}
                        value={palier.description}
                        onChange={(e) => setPalierVal(i, 'description', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-bleu outline-none"
                      />
                    </div>
                    {paliers.length > 1 && (
                      <button
                        onClick={() => supprimerPalier(i)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 mt-0.5"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Erreur ── */}
            {error && (
              <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
                {error}
              </p>
            )}

            {/* ── Actions ── */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setIsPreview(true)}
                disabled={!form.titre.trim()}
                className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Eye size={16} />
                Aperçu
              </button>
              <button
                onClick={() => handleSubmit('brouillon')}
                disabled={isSaving || !form.titre.trim() || !form.description.trim()}
                className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium border border-bleu text-bleu rounded-xl hover:bg-bleu/5 disabled:opacity-40 transition-colors"
              >
                <Save size={16} />
                Sauvegarder en brouillon
              </button>
              <button
                onClick={() => handleSubmit('actif')}
                disabled={isSaving || !form.titre.trim() || !form.description.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold bg-bleu text-white rounded-xl hover:bg-bleu-clair disabled:opacity-40 transition-colors shadow-sm"
              >
                {isSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Publier le projet
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
