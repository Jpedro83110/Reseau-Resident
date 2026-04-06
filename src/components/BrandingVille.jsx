// src/components/BrandingVille.jsx
// Composant partagé de branding pour une ville : upload logo, couleurs primaire/secondaire, aperçu.
import { useState } from 'react';
import { Palette, Upload, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BrandingVille({ ville, onUpdate }) {
  const [logo, setLogo] = useState(ville?.logo_url || '');
  const [cp, setCp] = useState(ville?.couleur_primaire || '#1a3a5c');
  const [cs, setCs] = useState(ville?.couleur_secondaire || '#c8963e');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) {
      setMsg('Le logo ne doit pas dépasser 2 Mo.');
      return;
    }

    // Essayer Supabase Storage d'abord, sinon fallback base64
    const ext = file.name.split('.').pop();
    const path = `logos/${ville.id}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('villes-logos')
      .upload(path, file, { upsert: true });

    if (!uploadErr) {
      const { data } = supabase.storage.from('villes-logos').getPublicUrl(path);
      setLogo(data?.publicUrl || '');
    } else {
      // Fallback : convertir en base64 et stocker directement
      const reader = new FileReader();
      reader.onload = () => setLogo(reader.result);
      reader.readAsDataURL(file);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('villes')
      .update({
        logo_url: logo || null,
        couleur_primaire: cp,
        couleur_secondaire: cs,
      })
      .eq('id', ville.id);
    setSaving(false);
    if (error) {
      setMsg('Erreur : ' + error.message);
    } else {
      setMsg('Branding enregistré.');
      onUpdate?.();
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-texte mb-5 flex items-center gap-2">
        <Palette size={16} className="text-or" /> Branding de la ville
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Logo</label>
          <div className="flex items-center gap-3">
            {logo && (
              <img
                src={logo}
                alt="Logo"
                className="w-12 h-12 object-contain rounded-lg border border-gray-200"
              />
            )}
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:border-bleu transition-colors text-xs text-gray-500">
              <Upload size={14} /> Changer
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Couleur primaire</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cp}
              onChange={(e) => setCp(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={cp}
              onChange={(e) => setCp(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Couleur secondaire</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cs}
              onChange={(e) => setCs(e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={cs}
              onChange={(e) => setCs(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono"
            />
          </div>
        </div>
      </div>
      {/* Aperçu */}
      <div
        className="flex items-center gap-3 mb-4 p-3 rounded-lg"
        style={{ background: cp }}
      >
        {logo && (
          <img src={logo} alt="" className="w-8 h-8 object-contain rounded" />
        )}
        <span className="font-bold text-white text-sm">{ville?.nom}</span>
        <span
          className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: cs, color: 'white' }}
        >
          Aperçu
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-bleu text-white font-bold rounded-lg text-sm hover:bg-bleu-clair transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}{' '}
          Enregistrer
        </button>
        {msg && (
          <span
            className={`text-sm ${msg.startsWith('Erreur') ? 'text-red-500' : 'text-vert'}`}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
