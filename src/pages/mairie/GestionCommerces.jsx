// src/pages/mairie/GestionCommerces.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Store, CheckCircle2, XCircle, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import MairieNav from './components/MairieNav';
import usePageMeta from '../../hooks/usePageMeta';

export default function GestionCommerces() {
  const { user } = useAuth();
  usePageMeta('Mairie — Commerces');

  const [ville, setVille] = useState(null);
  const [commerces, setCommerces] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [search, setSearch] = useState('');
  const [filtreCat, setFiltreCat] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    async function charger() {
      try {
        const { data: profil } = await supabase.from('mairie_profiles').select('ville_id').eq('id', user.id).maybeSingle();
        if (!profil) { setIsLoading(false); return; }
        const { data: v } = await supabase.from('villes').select('id, nom').eq('id', profil.ville_id).maybeSingle();
        setVille(v);

        const [comRes, demRes] = await Promise.all([
          supabase.from('commerces').select('id, nom, categorie, avantage, adresse, actif, visites, created_at').eq('ville_id', v.id).order('nom'),
          supabase.from('commercants_inscrits').select('id, nom_commerce, categorie, email, avantage_propose, statut, created_at').order('created_at', { ascending: false }),
        ]);
        setCommerces(comRes.data ?? []);
        setDemandes((demRes.data ?? []).filter((d) => d.statut === 'en_attente'));
      } catch (err) {
        console.error('Erreur GestionCommerces:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [user]);

  async function toggleActif(id, actif) {
    await supabase.from('commerces').update({ actif: !actif }).eq('id', id);
    setCommerces((prev) => prev.map((c) => (c.id === id ? { ...c, actif: !actif } : c)));
  }

  async function validerDemande(demande) {
    const res = await fetch('/api/admin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        request_id: demande.id,
        access_token: (await supabase.auth.getSession()).data.session?.access_token,
      }),
    });
    if (res.ok) {
      const result = await res.json().catch(() => ({}));
      const commerceId = result?.commerce_id;

      // Créer le lien commercant_profiles si on trouve le user par email
      if (commerceId && demande.email) {
        try {
          const { data: userProfile } = await supabase.from('profiles').select('id').eq('email', demande.email).maybeSingle();
          if (userProfile) {
            await supabase.from('commercant_profiles').insert({
              id: userProfile.id,
              commerce_id: commerceId,
              role: 'owner',
            });
            await supabase.from('commerces').update({ owner_id: userProfile.id }).eq('id', commerceId);
          }
        } catch (e) {
          // Pas bloquant — le rattachement se fera au login
          console.error('Rattachement commerçant:', e);
        }
      }

      setDemandes((prev) => prev.filter((d) => d.id !== demande.id));
    }
  }

  async function refuserDemande(id) {
    const res = await fetch('/api/admin-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refuse',
        request_id: id,
        access_token: (await supabase.auth.getSession()).data.session?.access_token,
      }),
    });
    if (res.ok) setDemandes((prev) => prev.filter((d) => d.id !== id));
  }

  const categories = [...new Set(commerces.map((c) => c.categorie))].sort();
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

            {/* Demandes en attente */}
            {demandes.length > 0 && (
              <section className="mb-8">
                <h2 className="font-semibold text-texte mb-3 flex items-center gap-2">
                  <Store size={18} className="text-or" />
                  Demandes en attente ({demandes.length})
                </h2>
                <div className="space-y-3">
                  {demandes.map((d) => (
                    <div key={d.id} className="bg-white rounded-xl border border-or/20 p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{d.nom_commerce}</p>
                        <p className="text-xs text-gray-500">{d.categorie} · {d.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{d.avantage_propose}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => validerDemande(d)} className="p-2 bg-green-50 hover:bg-green-100 text-vert rounded-lg transition-colors" title="Valider">
                          <CheckCircle2 size={18} />
                        </button>
                        <button onClick={() => refuserDemande(d.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Refuser">
                          <XCircle size={18} />
                        </button>
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

            {/* Tableau */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div>Commerce</div>
                <div>Catégorie</div>
                <div>Visites</div>
                <div>Statut</div>
                <div>Action</div>
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
                    <span className="text-sm font-bold text-texte">{c.visites}</span>
                    <span className={`text-xs font-bold ${c.actif ? 'text-vert' : 'text-red-500'}`}>{c.actif ? 'Actif' : 'Inactif'}</span>
                    <button onClick={() => toggleActif(c.id, c.actif)} className="p-1 text-gray-400 hover:text-bleu transition-colors" title={c.actif ? 'Désactiver' : 'Activer'}>
                      {c.actif ? <ToggleRight size={22} className="text-vert" /> : <ToggleLeft size={22} />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
