// src/pages/commercant/components/FicheCommerce.jsx
// Fiche commerce en lecture + mode édition avec horaires JSONB
import { useState } from 'react';
import { Edit3, Save, X, MapPin, Phone, Mail, Globe, Clock, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../components/ui/Toast';

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 Mo

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_LABELS = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

const DEFAULT_HORAIRES = Object.fromEntries(JOURS.map((j) => [j, { ouvert: j !== 'dimanche', debut: '09:00', fin: '19:00' }]));

export default function FicheCommerce({ commerce, onUpdate }) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState(commerce.photos ?? []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [form, setForm] = useState({
    nom: commerce.nom || '',
    categorie: commerce.categorie || '',
    description: commerce.description || '',
    adresse: commerce.adresse || '',
    telephone: commerce.telephone || '',
    email: commerce.email || commerce.email_contact || '',
    site_web: commerce.site_web || '',
    horaires: commerce.horaires || DEFAULT_HORAIRES,
  });

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_SIZE) { setPhotoError('La photo ne doit pas dépasser 2 Mo.'); return; }
    if (photos.length >= MAX_PHOTOS) { setPhotoError(`Maximum ${MAX_PHOTOS} photos.`); return; }

    try {
      setUploadingPhoto(true);
      setPhotoError(null);
      const ext = file.name.split('.').pop();
      const path = `${commerce.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('commerces-photos').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('commerces-photos').getPublicUrl(path);
      const newPhotos = [...photos, urlData.publicUrl];
      const { error: updErr } = await supabase.from('commerces').update({ photos: newPhotos }).eq('id', commerce.id);
      if (updErr) throw updErr;
      setPhotos(newPhotos);
      onUpdate?.();
    } catch (err) {
      console.error('Erreur upload photo:', err);
      setPhotoError('Erreur lors de l\'upload de la photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handlePhotoDelete(url) {
    try {
      const newPhotos = photos.filter((p) => p !== url);
      const { error: updErr } = await supabase.from('commerces').update({ photos: newPhotos }).eq('id', commerce.id);
      if (updErr) throw updErr;
      setPhotos(newPhotos);
      onUpdate?.();
    } catch (err) {
      console.error('Erreur suppression photo:', err);
    }
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('commerces').update({
      nom: form.nom,
      categorie: form.categorie,
      description: form.description,
      adresse: form.adresse,
      telephone: form.telephone,
      email_contact: form.email,
      site_web: form.site_web,
      horaires: form.horaires,
    }).eq('id', commerce.id);
    setSaving(false);
    if (!error) {
      setEditing(false);
      onUpdate?.();
      showToast({ type: 'success', message: 'Fiche commerce enregistrée' });
    } else {
      showToast({ type: 'error', message: 'Erreur lors de l\'enregistrement' });
    }
  }

  function updateHoraire(jour, field, value) {
    setForm((f) => ({
      ...f,
      horaires: { ...f.horaires, [jour]: { ...f.horaires[jour], [field]: value } },
    }));
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-serif text-xl font-bold text-texte">{commerce.nom}</h2>
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-bleu hover:bg-bleu/5 rounded-lg transition-colors">
            <Edit3 size={14} /> Modifier
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-bleu/10 text-bleu">{commerce.categorie}</span>
          {commerce.description && <p className="text-sm text-gray-600">{commerce.description}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
            {commerce.adresse && <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400 shrink-0" />{commerce.adresse}</div>}
            {commerce.telephone && <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400 shrink-0" />{commerce.telephone}</div>}
            {(commerce.email || commerce.email_contact) && <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400 shrink-0" />{commerce.email || commerce.email_contact}</div>}
            {commerce.site_web && <div className="flex items-center gap-2"><Globe size={14} className="text-gray-400 shrink-0" /><a href={commerce.site_web} target="_blank" rel="noopener noreferrer" className="text-bleu hover:underline truncate">{commerce.site_web}</a></div>}
          </div>

          {commerce.horaires && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Clock size={12} /> Horaires</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {JOURS.map((j) => {
                  const h = commerce.horaires[j];
                  return (
                    <div key={j} className="flex justify-between py-1">
                      <span className="font-medium text-gray-700">{JOURS_LABELS[j]}</span>
                      <span className={h?.ouvert ? 'text-vert' : 'text-red-400'}>{h?.ouvert ? `${h.debut} – ${h.fin}` : 'Fermé'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ImageIcon size={12} /> Photos
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="h-24 rounded-lg overflow-hidden">
                    <img loading="lazy" decoding="async" src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mode édition
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-xl font-bold text-texte">Modifier la fiche</h2>
        <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Nom</label>
            <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Catégorie</label>
            <input value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Adresse</label>
            <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Téléphone</label>
            <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Site web</label>
            <input value={form.site_web} onChange={(e) => setForm({ ...form, site_web: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
          </div>
        </div>

        {/* Horaires */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">Horaires</label>
          <div className="space-y-2">
            {JOURS.map((j) => {
              const h = form.horaires?.[j] ?? { ouvert: false, debut: '09:00', fin: '19:00' };
              return (
                <div key={j} className="flex items-center gap-3 text-sm">
                  <span className="w-20 font-medium text-gray-700">{JOURS_LABELS[j]}</span>
                  <button type="button" onClick={() => updateHoraire(j, 'ouvert', !h.ouvert)}
                    className={`px-2 py-0.5 rounded text-xs font-bold ${h.ouvert ? 'bg-vert/10 text-vert' : 'bg-red-50 text-red-400'}`}>
                    {h.ouvert ? 'Ouvert' : 'Fermé'}
                  </button>
                  {h.ouvert && (
                    <>
                      <input type="time" value={h.debut} onChange={(e) => updateHoraire(j, 'debut', e.target.value)}
                        className="border border-gray-200 rounded px-2 py-0.5 text-xs" />
                      <span className="text-gray-400">→</span>
                      <input type="time" value={h.fin} onChange={(e) => updateHoraire(j, 'fin', e.target.value)}
                        className="border border-gray-200 rounded px-2 py-0.5 text-xs" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Photos du commerce */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">Photos du commerce ({photos.length}/{MAX_PHOTOS})</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {photos.map((url, i) => (
              <div key={i} className="relative h-24 rounded-lg overflow-hidden border border-gray-200 group">
                <img loading="lazy" decoding="async" src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handlePhotoDelete(url)}
                  className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-full text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Supprimer la photo"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-bleu/50 transition-colors">
                {uploadingPhoto ? (
                  <span className="w-5 h-5 border-2 border-gray-300 border-t-bleu rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={16} className="text-gray-300 mb-1" />
                    <span className="text-[10px] text-gray-400">Ajouter (max 2 Mo)</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
              </label>
            )}
          </div>
          {photoError && (
            <p className="text-xs text-red-600 mb-2">{photoError}</p>
          )}
        </div>

        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors disabled:opacity-50">
          <Save size={14} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
