// src/pages/mairie/GestionSignalements.jsx
// Liste paginée des signalements résidents pour la mairie
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Clock, MessageSquare, ChevronDown, Filter, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

const STATUTS = {
  ouvert:   { label: 'Ouvert',   bg: 'bg-orange-50',   text: 'text-orange-700' },
  en_cours: { label: 'En cours', bg: 'bg-blue-50',     text: 'text-blue-700' },
  resolu:   { label: 'Résolu',   bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  rejete:   { label: 'Rejeté',   bg: 'bg-red-50',      text: 'text-red-600' },
};

const CATEGORIES = {
  voirie:   'Voirie',
  proprete: 'Propreté',
  securite: 'Sécurité',
  bruit:    'Bruit',
  autre:    'Autre',
};

const PAGE_SIZE = 15;

export default function GestionSignalements() {
  const { user } = useAuth();
  usePageMeta('Mairie — Signalements');

  const [ville, setVille] = useState(null);
  const [signalements, setSignalements] = useState([]);
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reponse, setReponse] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

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
        await chargerSignalements(v.id, 'tous', 0);
      } catch (err) {
        setError('Erreur de chargement.');
        console.error('Erreur GestionSignalements:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user]);

  async function chargerSignalements(villeId, statut, pageNum) {
    let query = supabase
      .from('signalements')
      .select('id, categorie, titre, description, adresse, photo_url, statut, reponse_mairie, created_at, auteur_id', { count: 'exact' })
      .eq('ville_id', villeId ?? ville?.id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (statut && statut !== 'tous') {
      query = query.eq('statut', statut);
    }

    const { data, count, error: qErr } = await query;
    if (qErr) throw qErr;
    setSignalements(data ?? []);
    setTotal(count ?? 0);
  }

  async function handleFiltreChange(newStatut) {
    setFiltreStatut(newStatut);
    setPage(0);
    setSelected(null);
    await chargerSignalements(ville?.id, newStatut, 0);
  }

  async function handlePageChange(newPage) {
    setPage(newPage);
    setSelected(null);
    await chargerSignalements(ville?.id, filtreStatut, newPage);
  }

  async function handleChangeStatut(signalementId, newStatut) {
    try {
      setIsSaving(true);
      const payload = { statut: newStatut };
      if (reponse.trim()) payload.reponse_mairie = reponse.trim();
      const { error: updErr } = await supabase.from('signalements').update(payload).eq('id', signalementId);
      if (updErr) throw updErr;
      // Rafraîchir la liste
      await chargerSignalements(ville?.id, filtreStatut, page);
      setSelected(null);
      setReponse('');
    } catch (err) {
      console.error('Erreur mise à jour signalement:', err);
    } finally {
      setIsSaving(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            <AlertTriangle size={14} /> Signalements des résidents
          </p>
        </div>

        <div className="flex gap-8">
          <MairieNav />

          <main className="flex-1 min-w-0 space-y-6">
            {/* Barre filtre */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-serif text-xl font-bold text-texte">
                Signalements ({total})
              </h2>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                {['tous', 'ouvert', 'en_cours', 'resolu', 'rejete'].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleFiltreChange(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filtreStatut === s
                        ? 'bg-bleu text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'tous' ? 'Tous' : STATUTS[s]?.label ?? s}
                  </button>
                ))}
              </div>
            </div>

            {/* Liste */}
            {signalements.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <AlertTriangle size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Aucun signalement pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signalements.map((s, index) => {
                  const statut = STATUTS[s.statut] ?? STATUTS.ouvert;
                  const isSelected = selected === s.id;

                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                    >
                      {/* En-tête */}
                      <button
                        onClick={() => setSelected(isSelected ? null : s.id)}
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statut.bg} ${statut.text}`}>
                              {statut.label}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-medium">
                              {CATEGORIES[s.categorie] ?? s.categorie}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-texte truncate">{s.titre}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock size={10} />
                            {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {s.adresse && (
                              <span className="flex items-center gap-1 ml-2">
                                <MapPin size={10} />
                                {s.adresse}
                              </span>
                            )}
                          </p>
                        </div>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Détail */}
                      {isSelected && (
                        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                          {s.description && (
                            <p className="text-sm text-gray-600">{s.description}</p>
                          )}
                          {s.photo_url && (
                            <div className="h-40 rounded-lg overflow-hidden border border-gray-200">
                              <img src={s.photo_url} alt="Photo du signalement" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                          )}
                          {s.reponse_mairie && (
                            <div className="bg-blue-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                                <MessageSquare size={12} /> Réponse de la mairie
                              </p>
                              <p className="text-sm text-blue-800">{s.reponse_mairie}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Réponse (optionnel)</label>
                              <textarea
                                rows={2}
                                value={selected === s.id ? reponse : ''}
                                onChange={(e) => setReponse(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-bleu focus:border-bleu outline-none resize-none"
                                placeholder="Écrire une réponse au résident..."
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {s.statut !== 'en_cours' && (
                                <button
                                  onClick={() => handleChangeStatut(s.id, 'en_cours')}
                                  disabled={isSaving}
                                  className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                >
                                  Marquer en cours
                                </button>
                              )}
                              {s.statut !== 'resolu' && (
                                <button
                                  onClick={() => handleChangeStatut(s.id, 'resolu')}
                                  disabled={isSaving}
                                  className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                >
                                  Marquer résolu
                                </button>
                              )}
                              {s.statut !== 'rejete' && (
                                <button
                                  onClick={() => handleChangeStatut(s.id, 'rejete')}
                                  disabled={isSaving}
                                  className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  Rejeter
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Précédent
                </button>
                <span className="text-sm text-gray-500">
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Suivant
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
