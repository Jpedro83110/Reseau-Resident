// src/pages/dashboard/GestionUtilisateurs.jsx
// Gestion des utilisateurs pour le dashboard admin : tableau paginé, recherche, gestion des rôles.
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, ChevronLeft, ChevronRight, Shield, X, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import useDebounce from '../../hooks/useDebounce';
import usePageMeta from '../../hooks/usePageMeta';

const PAGE_SIZE = 25;

const ROLE_LABELS = {
  commercant: 'Commerçant',
  association: 'Association',
  mairie: 'Mairie',
  admin: 'Admin',
};

const ROLE_COLORS = {
  commercant: 'bg-or/10 text-or border-or/20',
  association: 'bg-vert/10 text-vert border-vert/20',
  mairie: 'bg-bleu/10 text-bleu border-bleu/20',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
};

// ── Modal gestion des rôles ─────────────────────────────────
function RolesModal({ user, onClose }) {
  const { showToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(null);
  const [removing, setRemoving] = useState(null);

  // Charger les rôles de l'utilisateur
  const chargerRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const rolesFound = [];

      const [commercantRes, associationRes, mairieRes, adminRes] = await Promise.all([
        supabase.from('commercant_profiles').select('id, commerce_id, role').eq('id', user.id),
        supabase.from('association_profiles').select('id, association_id, role').eq('id', user.id),
        supabase.from('mairie_profiles').select('id, ville_id, role, service').eq('id', user.id),
        supabase.from('admins').select('id, role').eq('id', user.id),
      ]);

      if (commercantRes.data?.length > 0) {
        commercantRes.data.forEach((r) => rolesFound.push({ type: 'commercant', ...r }));
      }
      if (associationRes.data?.length > 0) {
        associationRes.data.forEach((r) => rolesFound.push({ type: 'association', ...r }));
      }
      if (mairieRes.data?.length > 0) {
        mairieRes.data.forEach((r) => rolesFound.push({ type: 'mairie', ...r }));
      }
      if (adminRes.data?.length > 0) {
        adminRes.data.forEach((r) => rolesFound.push({ type: 'admin', ...r }));
      }

      setRoles(rolesFound);
    } catch (err) {
      setError('Erreur lors du chargement des rôles.');
      console.error('Erreur chargement rôles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    chargerRoles();
  }, [chargerRoles]);

  // Ajouter un rôle
  async function ajouterRole(type) {
    setAdding(type);
    setError(null);
    try {
      let insertError;
      if (type === 'admin') {
        const { error } = await supabase.from('admins').insert({ id: user.id, role: 'admin' });
        insertError = error;
      } else if (type === 'mairie') {
        const { error } = await supabase.from('mairie_profiles').insert({ id: user.id, role: 'agent' });
        insertError = error;
      } else if (type === 'commercant') {
        const { error } = await supabase.from('commercant_profiles').insert({ id: user.id, role: 'owner' });
        insertError = error;
      } else if (type === 'association') {
        const { error } = await supabase.from('association_profiles').insert({ id: user.id, role: 'membre' });
        insertError = error;
      }

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Ce rôle existe déjà pour cet utilisateur.');
        } else {
          setError('Erreur : ' + insertError.message);
        }
        showToast({ type: 'error', message: 'Erreur lors de l\'ajout du rôle' });
      } else {
        await chargerRoles();
        showToast({ type: 'success', message: `Rôle ${ROLE_LABELS[type]} ajouté` });
      }
    } catch (err) {
      setError('Erreur lors de l\'ajout du rôle.');
      console.error('Erreur ajout rôle:', err);
      showToast({ type: 'error', message: 'Erreur lors de l\'ajout du rôle' });
    } finally {
      setAdding(null);
    }
  }

  // Retirer un rôle
  async function retirerRole(type) {
    setRemoving(type);
    setError(null);
    try {
      const table = type === 'admin' ? 'admins'
        : type === 'commercant' ? 'commercant_profiles'
        : type === 'association' ? 'association_profiles'
        : 'mairie_profiles';

      const { error: deleteError } = await supabase.from(table).delete().eq('id', user.id);
      if (deleteError) {
        setError('Erreur : ' + deleteError.message);
        showToast({ type: 'error', message: 'Erreur lors de la suppression du rôle' });
      } else {
        await chargerRoles();
        showToast({ type: 'success', message: `Rôle ${ROLE_LABELS[type]} retiré` });
      }
    } catch (err) {
      setError('Erreur lors de la suppression du rôle.');
      console.error('Erreur suppression rôle:', err);
      showToast({ type: 'error', message: 'Erreur lors de la suppression du rôle' });
    } finally {
      setRemoving(null);
    }
  }

  const rolesActifs = roles.map((r) => r.type);
  const rolesDisponibles = Object.keys(ROLE_LABELS).filter((r) => !rolesActifs.includes(r));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-serif text-lg font-bold text-texte">Gestion des rôles</h3>
            <p className="text-sm text-gray-500">{user.prenom} {user.nom} — {user.email}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-bleu rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Rôles actuels */}
              <div>
                <h4 className="text-sm font-bold text-gray-600 mb-3">Rôles actuels</h4>
                {roles.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun rôle supplémentaire (résident uniquement).</p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((r, i) => (
                      <div key={`${r.type}-${i}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${ROLE_COLORS[r.type]}`}>
                            {ROLE_LABELS[r.type]}
                          </span>
                          {r.role && <span className="text-xs text-gray-400">({r.role})</span>}
                        </div>
                        <button
                          onClick={() => retirerRole(r.type)}
                          disabled={removing === r.type}
                          aria-label={`Retirer le rôle ${ROLE_LABELS[r.type]}`}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {removing === r.type ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ajouter un rôle */}
              {rolesDisponibles.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-600 mb-3">Ajouter un rôle</h4>
                  <div className="flex flex-wrap gap-2">
                    {rolesDisponibles.map((type) => (
                      <button
                        key={type}
                        onClick={() => ajouterRole(type)}
                        disabled={adding === type}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-bleu hover:text-bleu transition-colors disabled:opacity-50"
                      >
                        {adding === type ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {ROLE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────
export default function GestionUtilisateurs() {
  usePageMeta('Admin — Utilisateurs');

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  // Charger les utilisateurs
  const chargerUtilisateurs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('profiles')
        .select('id, prenom, nom, email, ville_id, points, niveau, created_at, villes(nom)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim();
        query = query.or(`email.ilike.%${s}%,prenom.ilike.%${s}%,nom.ilike.%${s}%`);
      }

      const { data, error: queryError, count } = await query;
      if (queryError) throw queryError;

      setUsers(data ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs.');
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    chargerUtilisateurs();
  }, [chargerUtilisateurs]);

  // Remettre à la page 0 quand la recherche change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-texte flex items-center gap-2">
            <Users size={22} className="text-bleu" />
            Utilisateurs
          </h2>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString('fr-FR')} utilisateur{total !== 1 ? 's' : ''} inscrit{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Recherche */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:border-or focus:ring-2 focus:ring-or/20 outline-none"
          />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
          <button onClick={chargerUtilisateurs} className="ml-3 underline font-medium hover:text-red-900">
            Réessayer
          </button>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-bleu rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">
              {debouncedSearch ? 'Aucun utilisateur trouvé pour cette recherche.' : 'Aucun utilisateur inscrit.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4">Prénom</th>
                  <th className="p-4">Nom</th>
                  <th className="p-4 hidden md:table-cell">Email</th>
                  <th className="p-4 hidden lg:table-cell">Ville</th>
                  <th className="p-4 hidden lg:table-cell text-right">Points</th>
                  <th className="p-4 hidden xl:table-cell">Niveau</th>
                  <th className="p-4 hidden md:table-cell">Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-texte">{u.prenom || '—'}</td>
                    <td className="p-4 font-medium text-texte">{u.nom || '—'}</td>
                    <td className="p-4 text-sm text-gray-500 hidden md:table-cell">{u.email}</td>
                    <td className="p-4 text-sm text-gray-500 hidden lg:table-cell">{u.villes?.nom || '—'}</td>
                    <td className="p-4 text-sm font-bold text-bleu text-right hidden lg:table-cell">{(u.points ?? 0).toLocaleString('fr-FR')}</td>
                    <td className="p-4 hidden xl:table-cell">
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                        Niv. {u.niveau ?? 1}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-400 hidden md:table-cell">{formatDate(u.created_at)}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedUser(u)}
                        aria-label={`Gérer les rôles de ${u.prenom} ${u.nom}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-bleu bg-bleu/10 hover:bg-bleu/20 rounded-lg transition-colors"
                      >
                        <Shield size={13} /> Rôles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && users.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total.toLocaleString('fr-FR')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Page précédente"
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <span className="text-xs font-medium text-gray-600">
                Page {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Page suivante"
                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal rôles */}
      <AnimatePresence>
        {selectedUser && (
          <RolesModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
