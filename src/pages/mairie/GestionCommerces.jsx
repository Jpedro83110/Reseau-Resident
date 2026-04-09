// src/pages/mairie/GestionCommerces.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, CheckCircle2, XCircle, Search, ToggleLeft, ToggleRight, Eye, Pencil, Trash2, X, Save, Loader2, MapPin, Phone, Mail, Globe, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

export default function GestionCommerces() {
  const { user } = useAuth();
  const { showToast } = useToast();
  usePageMeta('Mairie — Commerces');

  const [ville, setVille] = useState(null);
  const [commerces, setCommerces] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [search, setSearch] = useState('');
  const [filtreCat, setFiltreCat] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCommerce, setSelectedCommerce] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [refusMotif, setRefusMotif] = useState('');
  const [showRefusModal, setShowRefusModal] = useState(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    charger();
  }, [user]);

  async function charger() {
    try {
      const { data: profil } = await supabase.from('mairie_profiles').select('ville_id').eq('id', user.id).maybeSingle();
      if (!profil) { setIsLoading(false); return; }
      const { data: v } = await supabase.from('villes').select('id, nom, slug').eq('id', profil.ville_id).maybeSingle();
      setVille(v);

      const [comRes, demRes] = await Promise.all([
        supabase.from('commerces').select('id, nom, categorie, avantage, adresse, telephone, email_contact, site_web, description, horaires, actif, premium, visites, owner_id, created_at').eq('ville_id', v.id).order('nom'),
        supabase.from('commercants_inscrits').select('id, nom_commerce, categorie, email, telephone, avantage_propose, adresse, nom_ville, statut, created_at').order('created_at', { ascending: false }),
      ]);
      setCommerces(comRes.data ?? []);
      setDemandes((demRes.data ?? []).filter((d) => d.statut === 'en_attente'));
    } catch (err) {
      console.error('Erreur GestionCommerces:', err);
      setError('Erreur lors du chargement des données.');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleActif(id, actif) {
    const { error: err } = await supabase.from('commerces').update({ actif: !actif }).eq('id', id);
    if (err) { console.error('Erreur toggle:', err); showToast({ type: 'error', message: 'Erreur lors du changement de statut' }); return; }
    setCommerces((prev) => prev.map((c) => (c.id === id ? { ...c, actif: !actif } : c)));
    showToast({ type: 'success', message: actif ? 'Commerce désactivé' : 'Commerce activé' });
  }

  // ── Validation directe (sans passer par /api/admin-action) ──
  // La mairie valide directement via service côté client (service_role pas nécessaire, RLS le permet)
  async function validerDemande(demande) {
    setActionLoading(demande.id);
    setError(null);
    try {
      // 1. Trouver ou créer la ville
      let villeId = ville?.id;
      if (!villeId) {
        const { data: v } = await supabase.from('villes').select('id').ilike('nom', demande.nom_ville || '').maybeSingle();
        villeId = v?.id;
      }

      if (!villeId) {
        setError('Impossible de trouver la ville pour ce commerce.');
        setActionLoading(null);
        return;
      }

      // 2. Créer le commerce
      const { data: newCommerce, error: insertErr } = await supabase.from('commerces').insert({
        ville_id: villeId,
        nom: demande.nom_commerce,
        categorie: demande.categorie,
        avantage: demande.avantage_propose,
        adresse: demande.adresse || '',
        telephone: demande.telephone || '',
        email_contact: demande.email,
        actif: true,
      }).select('id, nom, categorie, avantage, adresse, telephone, email_contact, actif, visites, created_at').single();

      if (insertErr) throw insertErr;

      // 3. Mettre à jour le statut de la demande
      await supabase.from('commercants_inscrits').update({ statut: 'valide' }).eq('id', demande.id);

      // 4. Lier le profil commerçant si l'utilisateur existe
      if (demande.email && newCommerce) {
        const { data: userProfile } = await supabase.from('profiles').select('id').eq('email', demande.email).maybeSingle();
        if (userProfile) {
          await supabase.from('commercant_profiles').upsert({
            id: userProfile.id,
            commerce_id: newCommerce.id,
            role: 'owner',
          }, { onConflict: 'id' });
          await supabase.from('commerces').update({ owner_id: userProfile.id }).eq('id', newCommerce.id);
        }
      }

      // 5. Mettre à jour l'UI
      setDemandes((prev) => prev.filter((d) => d.id !== demande.id));
      setCommerces((prev) => [...prev, newCommerce]);
      showToast({ type: 'success', message: `Commerce "${demande.nom_commerce}" validé avec succès` });

    } catch (err) {
      console.error('Erreur validation commerce:', err);
      setError('Erreur lors de la validation. Vérifiez que les tables et policies sont correctes.');
      showToast({ type: 'error', message: 'Erreur lors de la validation du commerce' });
    } finally {
      setActionLoading(null);
    }
  }

  async function refuserDemande(id) {
    setActionLoading(id);
    try {
      await supabase.from('commercants_inscrits').update({
        statut: 'refuse',
      }).eq('id', id);
      setDemandes((prev) => prev.filter((d) => d.id !== id));
      setShowRefusModal(null);
      setRefusMotif('');
      showToast({ type: 'success', message: 'Demande refusée' });
    } catch (err) {
      console.error('Erreur refus:', err);
      showToast({ type: 'error', message: 'Erreur lors du refus de la demande' });
    } finally {
      setActionLoading(null);
    }
  }

  // ── Voir fiche commerce ──
  function voirFiche(commerce) {
    setSelectedCommerce(commerce);
    setEditMode(false);
  }

  // ── Modifier commerce ──
  function startEdit(commerce) {
    setEditForm({
      nom: commerce.nom || '',
      categorie: commerce.categorie || '',
      description: commerce.description || '',
      avantage: commerce.avantage || '',
      adresse: commerce.adresse || '',
      telephone: commerce.telephone || '',
      email_contact: commerce.email_contact || '',
      site_web: commerce.site_web || '',
    });
    setSelectedCommerce(commerce);
    setEditMode(true);
  }

  async function handleSaveEdit() {
    if (!selectedCommerce) return;
    setSaving(true);
    const { error: err } = await supabase.from('commerces').update({
      nom: editForm.nom,
      categorie: editForm.categorie,
      description: editForm.description,
      avantage: editForm.avantage,
      adresse: editForm.adresse,
      telephone: editForm.telephone,
      email_contact: editForm.email_contact,
      site_web: editForm.site_web,
    }).eq('id', selectedCommerce.id);
    setSaving(false);

    if (!err) {
      setCommerces((prev) => prev.map((c) => c.id === selectedCommerce.id ? { ...c, ...editForm } : c));
      setSelectedCommerce(null);
      setEditMode(false);
      showToast({ type: 'success', message: 'Commerce modifié avec succès' });
    } else {
      showToast({ type: 'error', message: 'Erreur lors de la modification du commerce' });
    }
  }

  // ── Supprimer commerce ──
  async function handleDelete(id) {
    const { error: err } = await supabase.from('commerces').delete().eq('id', id);
    if (!err) {
      setCommerces((prev) => prev.filter((c) => c.id !== id));
      setShowDeleteConfirm(null);
      setSelectedCommerce(null);
      showToast({ type: 'success', message: 'Commerce supprimé' });
    } else {
      showToast({ type: 'error', message: 'Erreur lors de la suppression du commerce' });
    }
  }

  const categories = [...new Set(commerces.map((c) => c.categorie).filter(Boolean))].sort();
  const filtered = commerces.filter((c) => {
    if (search && !c.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtreCat && c.categorie !== filtreCat) return false;
    return true;
  });

  if (isLoading) return <div className="min-h-screen pt-28 bg-creme flex items-center justify-center"><div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex gap-8">
          <MairieNav />
          <main className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-bold text-texte mb-6">Gestion des commerces</h1>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={16} /></button>
              </div>
            )}

            {/* Demandes en attente */}
            {demandes.length > 0 && (
              <section className="mb-8">
                <h2 className="font-semibold text-texte mb-3 flex items-center gap-2">
                  <Store size={18} className="text-or" />
                  Demandes en attente ({demandes.length})
                </h2>
                <div className="space-y-3">
                  {demandes.map((d) => (
                    <div key={d.id} className="bg-white rounded-xl border border-or/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm">{d.nom_commerce}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{d.categorie} · {d.email}</p>
                          {d.telephone && <p className="text-xs text-gray-400">{d.telephone}</p>}
                          {d.adresse && <p className="text-xs text-gray-400">{d.adresse}</p>}
                          <p className="text-xs text-or mt-1">Avantage : {d.avantage_propose}</p>
                          <p className="text-[10px] text-gray-300 mt-1">
                            Demande du {new Date(d.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => validerDemande(d)}
                            disabled={actionLoading === d.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-vert rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {actionLoading === d.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Valider
                          </button>
                          <button
                            onClick={() => setShowRefusModal(d)}
                            disabled={actionLoading === d.id}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            <XCircle size={14} /> Refuser
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un commerce..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-bleu/20 focus:border-bleu" />
              </div>
              <select value={filtreCat} onChange={(e) => setFiltreCat(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white">
                <option value="">Toutes catégories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Compteur */}
            <p className="text-xs text-gray-400 mb-3">{filtered.length} commerce{filtered.length > 1 ? 's' : ''} · {commerces.filter(c => c.actif).length} actif{commerces.filter(c => c.actif).length > 1 ? 's' : ''}</p>

            {/* Tableau */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div>Commerce</div>
                <div>Catégorie</div>
                <div>Visites</div>
                <div>Statut</div>
                <div>Actions</div>
              </div>
              {filtered.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Aucun commerce trouvé</p>
              ) : (
                filtered.map((c) => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 md:gap-4 px-4 py-3 border-t border-gray-100 items-center">
                    <div>
                      <p className="font-medium text-sm text-texte">{c.nom}</p>
                      <p className="text-xs text-gray-400">{c.adresse}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{c.categorie}</span>
                    <span className="text-sm font-bold text-texte">{c.visites || 0}</span>
                    <span className={`text-xs font-bold ${c.actif ? 'text-vert' : 'text-red-500'}`}>
                      {c.actif ? 'Actif' : 'Inactif'}
                      {c.premium && <span className="ml-1 text-or">★</span>}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => voirFiche(c)} className="p-1.5 text-gray-400 hover:text-bleu transition-colors" title="Voir la fiche">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => startEdit(c)} className="p-1.5 text-gray-400 hover:text-bleu transition-colors" title="Modifier">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => toggleActif(c.id, c.actif)} className="p-1.5 text-gray-400 hover:text-bleu transition-colors" title={c.actif ? 'Désactiver' : 'Activer'}>
                        {c.actif ? <ToggleRight size={20} className="text-vert" /> : <ToggleLeft size={20} />}
                      </button>
                      <button onClick={() => setShowDeleteConfirm(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── Modal fiche commerce (lecture / édition) ── */}
      <AnimatePresence>
        {selectedCommerce && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => { setSelectedCommerce(null); setEditMode(false); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-texte">
                  {editMode ? 'Modifier le commerce' : selectedCommerce.nom}
                </h2>
                <button onClick={() => { setSelectedCommerce(null); setEditMode(false); }} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <input value={editForm.categorie} onChange={(e) => setEditForm({ ...editForm, categorie: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Avantage proposé</label>
                    <input value={editForm.avantage} onChange={(e) => setEditForm({ ...editForm, avantage: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                      <input value={editForm.adresse} onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <input value={editForm.telephone} onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input value={editForm.email_contact} onChange={(e) => setEditForm({ ...editForm, email_contact: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Site web</label>
                      <input value={editForm.site_web} onChange={(e) => setEditForm({ ...editForm, site_web: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveEdit} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                    <button onClick={() => { setEditMode(false); setSelectedCommerce(null); }}
                      className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">{selectedCommerce.categorie}</span>
                    <span className={`text-xs font-bold ${selectedCommerce.actif ? 'text-vert' : 'text-red-500'}`}>
                      {selectedCommerce.actif ? 'Actif' : 'Inactif'}
                    </span>
                    {selectedCommerce.premium && <span className="text-xs text-or font-bold">★ Premium</span>}
                  </div>

                  {selectedCommerce.avantage && (
                    <div className="p-3 bg-or/5 border border-or/20 rounded-lg">
                      <p className="text-xs font-bold text-or mb-0.5">Avantage</p>
                      <p className="text-sm text-texte">{selectedCommerce.avantage}</p>
                    </div>
                  )}

                  {selectedCommerce.description && (
                    <p className="text-sm text-gray-600">{selectedCommerce.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    {selectedCommerce.adresse && (
                      <p className="flex items-center gap-2 text-gray-600"><MapPin size={14} className="text-gray-400" /> {selectedCommerce.adresse}</p>
                    )}
                    {selectedCommerce.telephone && (
                      <p className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" /> {selectedCommerce.telephone}</p>
                    )}
                    {selectedCommerce.email_contact && (
                      <p className="flex items-center gap-2 text-gray-600"><Mail size={14} className="text-gray-400" /> {selectedCommerce.email_contact}</p>
                    )}
                    {selectedCommerce.site_web && (
                      <p className="flex items-center gap-2 text-gray-600"><Globe size={14} className="text-gray-400" /> {selectedCommerce.site_web}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-2 text-xs text-gray-400">
                    <span>{selectedCommerce.visites || 0} visites</span>
                    <span>Inscrit le {new Date(selectedCommerce.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button onClick={() => startEdit(selectedCommerce)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-bleu text-white rounded-lg text-xs font-medium hover:bg-bleu-clair transition-colors">
                      <Pencil size={12} /> Modifier
                    </button>
                    <button onClick={() => toggleActif(selectedCommerce.id, selectedCommerce.actif)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors">
                      {selectedCommerce.actif ? <><ToggleLeft size={14} /> Désactiver</> : <><ToggleRight size={14} /> Activer</>}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(selectedCommerce.id)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50 transition-colors">
                      <Trash2 size={12} /> Supprimer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal confirmation suppression ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="font-bold text-texte mb-2">Supprimer ce commerce ?</h3>
              <p className="text-sm text-gray-500 mb-4">Cette action est irréversible. Le commerce et toutes ses données seront supprimés.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal refus avec motif ── */}
      <AnimatePresence>
        {showRefusModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
            onClick={() => { setShowRefusModal(null); setRefusMotif(''); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-texte mb-2">Refuser la demande</h3>
              <p className="text-sm text-gray-500 mb-3">Commerce : {showRefusModal.nom_commerce}</p>
              <textarea
                value={refusMotif}
                onChange={(e) => setRefusMotif(e.target.value)}
                placeholder="Motif du refus (optionnel)"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowRefusModal(null); setRefusMotif(''); }}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button
                  onClick={() => refuserDemande(showRefusModal.id)}
                  disabled={actionLoading === showRefusModal.id}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                  {actionLoading === showRefusModal.id ? 'Refus...' : 'Confirmer le refus'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
