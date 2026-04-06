// src/pages/dashboard/ParametresPlateforme.jsx
// Formulaire de gestion des paramètres globaux de la plateforme (table platform_settings).
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

const SETTINGS_KEYS = [
  { key: 'nom_plateforme', label: 'Nom de la plateforme', type: 'text', placeholder: 'Réseaux-Résident' },
  { key: 'email_contact', label: 'Email de contact', type: 'email', placeholder: 'contact@reseaux-resident.fr' },
  { key: 'url_cgv', label: 'URL des CGV', type: 'url', placeholder: 'https://reseaux-resident.fr/cgv' },
  { key: 'url_confidentialite', label: 'URL Politique de confidentialité', type: 'url', placeholder: 'https://reseaux-resident.fr/confidentialite' },
];

export default function ParametresPlateforme() {
  usePageMeta('Admin — Paramètres');

  const [values, setValues] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  // Charger les paramètres
  useEffect(() => {
    async function charger() {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('platform_settings')
          .select('key, value');

        if (queryError) throw queryError;

        const map = {};
        (data ?? []).forEach((row) => {
          // La valeur est stockée en JSONB — peut être un string, un objet, etc.
          map[row.key] = typeof row.value === 'string' ? row.value : (row.value?.value ?? '');
        });
        setValues(map);
      } catch (err) {
        setError('Erreur lors du chargement des paramètres.');
        console.error('Erreur chargement paramètres:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, []);

  // Sauvegarder les paramètres
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);

    try {
      const upserts = SETTINGS_KEYS.map((s) => ({
        key: s.key,
        value: values[s.key] || '',
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('platform_settings')
        .upsert(upserts, { onConflict: 'key' });

      if (upsertError) throw upsertError;

      setSaveResult({ ok: true, msg: 'Paramètres enregistrés avec succès.' });
    } catch (err) {
      setSaveResult({ ok: false, msg: 'Erreur lors de la sauvegarde : ' + err.message });
      console.error('Erreur sauvegarde paramètres:', err);
    } finally {
      setSaving(false);
      // Effacer le message de succès après 4 secondes
      setTimeout(() => setSaveResult(null), 4000);
    }
  }

  function handleChange(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-bleu rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-texte flex items-center gap-2">
          <Settings size={22} className="text-bleu" />
          Paramètres de la plateforme
        </h2>
        <p className="text-sm text-gray-500 mt-1">Configuration générale de Réseaux-Résident.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-5">
          {SETTINGS_KEYS.map((setting) => (
            <div key={setting.key}>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                {setting.label}
              </label>
              <input
                type={setting.type}
                value={values[setting.key] || ''}
                onChange={(e) => handleChange(setting.key, e.target.value)}
                placeholder={setting.placeholder}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none text-sm"
              />
            </div>
          ))}

          {/* Résultat sauvegarde */}
          {saveResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              saveResult.ok
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {saveResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {saveResult.msg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
