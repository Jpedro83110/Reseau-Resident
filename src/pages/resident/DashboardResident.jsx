// src/pages/resident/DashboardResident.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Store, Tag, MapPin, Building2, ArrowRight, Heart, Newspaper, FolderOpen, BarChart3, Users, Clock, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { CarteDigitale } from '../../components/index';
import Carte3D from './components/Carte3D';
import ProjetsLocaux from './components/ProjetsLocaux';
import NiveauBar from './components/NiveauBar';
import BadgesGrid from './components/BadgesGrid';
import DefisSection from './components/DefisSection';
import BoutonFavori from '../../components/BoutonFavori';
import ParrainageEspace from '../../components/ParrainageEspace';
import ActualitesVille from './components/ActualitesVille';
import SignalementForm from './components/SignalementForm';
import { useFavoris } from '../../hooks/useFavoris';
import usePageMeta from '../../hooks/usePageMeta';

// ── Sous-composant carte (état sans carte) ────────────────────
function PasDeCarteSection() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <CreditCard size={40} className="text-gray-300 mx-auto mb-4" />
      <h3 className="font-semibold text-gray-700 mb-2">Pas encore de carte résident</h3>
      <p className="text-sm text-gray-500 mb-4">
        Inscrivez-vous pour obtenir votre carte digitale et accéder aux avantages commerçants.
      </p>
      <Link
        to="/inscription"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-sm"
      >
        Obtenir ma carte
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

// ── Sous-composant offre ──────────────────────────────────────
function OffreCard({ offre }) {
  const typeLabel = {
    reduction: 'Réduction',
    cadeau: 'Cadeau',
    offre_speciale: 'Offre spéciale',
    programme_fidelite: 'Fidélité',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-or/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-texte text-sm">{offre.titre}</h4>
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 shrink-0">
          {typeLabel[offre.type] ?? offre.type}
        </span>
      </div>
      {offre.valeur && (
        <p className="text-or font-bold text-base mb-1">{offre.valeur}</p>
      )}
      {offre.description && (
        <p className="text-xs text-gray-500">{offre.description}</p>
      )}
      {offre.commerces && (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Store size={12} />
          {offre.commerces.nom}
        </p>
      )}
    </div>
  );
}

// ── Sous-composant commerce ───────────────────────────────────
function CommerceCard({ commerce, isFavori, onToggleFavori }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bleu/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-bleu/10 flex items-center justify-center text-bleu shrink-0">
          <Store size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-texte text-sm truncate">{commerce.nom}</h4>
          <span className="text-xs text-gray-400">{commerce.categorie}</span>
        </div>
        {onToggleFavori && (
          <BoutonFavori isFavori={isFavori} onClick={() => onToggleFavori('commerce', commerce.id)} size={14} />
        )}
      </div>
      {commerce.avantage && (
        <div className="mt-3 flex items-start gap-1.5 text-xs text-bleu-clair">
          <Tag size={13} className="shrink-0 mt-0.5" />
          <span>{commerce.avantage}</span>
        </div>
      )}
      {commerce.adresse && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-400">
          <MapPin size={13} className="shrink-0 mt-0.5" />
          <span className="truncate">{commerce.adresse}</span>
        </div>
      )}
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────
export default function DashboardResident() {
  const { user, profile } = useAuth();
  const { isFavori, toggleFavori } = useFavoris(profile?.id);
  usePageMeta('Mon espace');

  const [carte, setCarte] = useState(null);
  const [commerces, setCommerces] = useState([]);
  const [offres, setOffres] = useState([]);
  const [ville, setVille] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [statsPerso, setStatsPerso] = useState({ visites: 0, commercesVisites: 0, offresUtilisees: 0, filleuls: 0 });
  const [showSignalement, setShowSignalement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !profile) {
      setIsLoading(false);
      return;
    }

    async function chargerDonnees() {
      try {
        setIsLoading(true);

        // 1. Charger carte et ville en parallèle
        const [carteRes, villeRes] = await Promise.all([
          supabase
            .from('cartes')
            .select('id, numero, qr_token, formule, type_carte, statut, date_expiration, prenom, nom_titulaire')
            .eq('email', user.email)
            .eq('statut', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          profile.ville_id
            ? supabase.from('villes').select('id, nom, slug').eq('id', profile.ville_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (carteRes.error) throw carteRes.error;
        setCarte(carteRes.data);
        if (villeRes.data) setVille(villeRes.data);

        // 2. Si ville, charger commerces
        if (profile.ville_id) {
          const [commercesRes, tousIdsRes] = await Promise.all([
            supabase
              .from('commerces')
              .select('id, nom, categorie, avantage, adresse, telephone')
              .eq('ville_id', profile.ville_id)
              .eq('actif', true)
              .order('nom')
              .limit(12),
            supabase
              .from('commerces')
              .select('id')
              .eq('ville_id', profile.ville_id)
              .eq('actif', true),
          ]);

          if (commercesRes.error) throw commercesRes.error;
          setCommerces(commercesRes.data ?? []);

          // 3. Charger offres actives des commerces de la ville
          const idsCommerces = (tousIdsRes.data ?? []).map((c) => c.id);
          if (idsCommerces.length > 0) {
            const { data: offresData, error: offresError } = await supabase
              .from('offres')
              .select('id, titre, description, type, valeur, conditions, commerces(nom)')
              .in('commerce_id', idsCommerces)
              .eq('active', true)
              .order('created_at', { ascending: false })
              .limit(8);

            if (offresError) throw offresError;
            setOffres(offresData ?? []);
          }
        }

        // Historique des utilisations d'offres
        const { data: historiqueData } = await supabase
          .from('utilisations_offres')
          .select('id, date_utilisation, offres(titre, valeur), commerces(nom)')
          .eq('profile_id', profile.id)
          .order('date_utilisation', { ascending: false })
          .limit(10);
        setHistorique(historiqueData ?? []);

        // Stats personnelles
        const carteId = carteRes.data?.id;
        const [visitesRes, commercesDistRes, offresUtilRes, filleulsRes] = await Promise.all([
          carteId
            ? supabase.from('visites').select('id', { count: 'exact', head: true }).eq('carte_id', carteId)
            : Promise.resolve({ count: 0 }),
          carteId
            ? supabase.from('visites').select('commerce_id').eq('carte_id', carteId)
            : Promise.resolve({ data: [] }),
          supabase.from('utilisations_offres').select('id', { count: 'exact', head: true }).eq('profile_id', profile.id),
          supabase.from('parrainages').select('id', { count: 'exact', head: true }).eq('parrain_id', profile.id),
        ]);

        const commercesUniques = new Set((commercesDistRes.data ?? []).map((v) => v.commerce_id)).size;
        setStatsPerso({
          visites: visitesRes.count ?? 0,
          commercesVisites: commercesUniques,
          offresUtilisees: offresUtilRes.count ?? 0,
          filleuls: filleulsRes.count ?? 0,
        });
      } catch (err) {
        setError('Erreur lors du chargement de vos données.');
        console.error('Erreur DashboardResident:', err);
      } finally {
        setIsLoading(false);
      }
    }

    chargerDonnees();
  }, [user, profile]);

  // ── Écran chargement ──
  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Chargement de votre espace…</p>
        </div>
      </div>
    );
  }

  // ── Écran erreur ──
  if (error) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md mx-4">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ── Calcul de l'expiration ──
  let expStr = '';
  if (carte?.date_expiration) {
    const exp = new Date(carte.date_expiration);
    expStr = `${String(exp.getMonth() + 1).padStart(2, '0')}/${exp.getFullYear()}`;
  }
  const isDigital = carte?.type_carte === 'digitale' || carte?.type_carte === 'les_deux';

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-10"
        >
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-texte mb-1">
            Bonjour, {profile?.prenom} !
          </h1>
          {ville && (
            <p className="text-gray-500 flex items-center gap-1.5">
              <Building2 size={16} />
              Réseaux-Résident de {ville.nom}
            </p>
          )}
          {!ville && (
            <p className="text-gray-400 text-sm">
              Vous n'êtes rattaché à aucune ville.{' '}
              <Link to="/mon-espace/profil" className="text-bleu hover:underline">
                Compléter mon profil
              </Link>
            </p>
          )}
        </motion.div>

        {/* Section carte */}
        <section className="mb-10">
          <h2 className="font-serif text-xl font-bold text-texte mb-4 flex items-center gap-2">
            <CreditCard size={20} className="text-bleu" />
            Ma carte résident
          </h2>
          {carte ? (
            <Carte3D
              ville={ville?.nom ?? ''}
              numero={carte.numero}
              expiration={expStr}
              prenom={carte.prenom}
              nom={carte.nom_titulaire}
              formule={carte.formule}
              qrToken={isDigital ? carte.qr_token : null}
            />
          ) : (
            <PasDeCarteSection />
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Section offres */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2">
                <Tag size={20} className="text-or" />
                Offres disponibles
              </h2>
              <span className="text-sm text-gray-400">
                {offres.length} offre{offres.length !== 1 ? 's' : ''}
              </span>
            </div>

            {!profile?.ville_id ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-gray-400 text-sm">
                  Rattachez-vous à une ville pour voir les offres disponibles.
                </p>
              </div>
            ) : offres.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <Tag size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Aucune offre disponible pour le moment. Revenez bientôt !
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {offres.map((offre) => (
                  <OffreCard key={offre.id} offre={offre} />
                ))}
              </div>
            )}
          </section>

          {/* Section commerces */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold text-texte flex items-center gap-2">
                <Store size={20} className="text-bleu" />
                Commerces partenaires
              </h2>
              {ville && (
                <Link
                  to={`/villes/${ville.slug}`}
                  className="text-sm text-bleu hover:text-bleu-clair transition-colors font-medium"
                >
                  Voir tout
                </Link>
              )}
            </div>

            {!profile?.ville_id ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <p className="text-gray-400 text-sm">
                  Rattachez-vous à une ville pour voir les commerces.
                </p>
              </div>
            ) : commerces.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <Store size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">
                  Aucun commerce partenaire dans votre ville pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {commerces.map((commerce) => (
                  <CommerceCard
                    key={commerce.id}
                    commerce={commerce}
                    isFavori={isFavori('commerce', commerce.id)}
                    onToggleFavori={toggleFavori}
                  />
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Historique des utilisations d'offres */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold text-texte mb-4 flex items-center gap-2">
            <Clock size={20} className="text-or" />
            Historique
          </h2>
          {historique.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Clock size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucune utilisation d'offre pour le moment.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="hidden md:grid grid-cols-3 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <span>Date</span>
                <span>Offre</span>
                <span>Commerce</span>
              </div>
              {historique.map((item) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3 px-5 py-3 border-b border-gray-50 items-center">
                  <span className="text-sm text-gray-500">
                    {new Date(item.date_utilisation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-sm font-medium text-texte">
                    {item.offres?.titre ?? 'Offre inconnue'}
                    {item.offres?.valeur && <span className="ml-2 text-or font-bold">{item.offres.valeur}</span>}
                  </span>
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Store size={12} className="shrink-0" />
                    {item.commerces?.nom ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section actualités */}
        {profile?.ville_id && (
          <section className="mt-10">
            <h2 className="font-serif text-xl font-bold text-texte mb-4 flex items-center gap-2">
              <Newspaper size={20} className="text-bleu" />
              Actualités de votre ville
            </h2>
            <ActualitesVille villeId={profile.ville_id} limit={3} />
          </section>
        )}

        {/* Section projets locaux */}
        {profile?.ville_id && (
          <section className="mt-10">
            <h2 className="font-serif text-xl font-bold text-texte mb-4 flex items-center gap-2">
              <FolderOpen size={20} className="text-vert" />
              Projets locaux
            </h2>
            <ProjetsLocaux villeId={profile.ville_id} limit={3} />
          </section>
        )}

        {/* Niveau et gamification */}
        {profile && (
          <section className="mt-10 space-y-6">
            <NiveauBar points={profile.points ?? 0} niveau={profile.niveau ?? 1} />
            <DefisSection villeId={profile.ville_id} profileId={profile.id} />
            <BadgesGrid profileId={profile.id} />
          </section>
        )}

        {/* Mes statistiques */}
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold text-texte mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-bleu" />
            Mes statistiques
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <Store size={18} className="text-bleu mb-2" />
              <div className="text-2xl font-bold text-texte">{statsPerso.visites}</div>
              <div className="text-xs text-gray-500">Visites totales</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <MapPin size={18} className="text-or mb-2" />
              <div className="text-2xl font-bold text-texte">{statsPerso.commercesVisites}</div>
              <div className="text-xs text-gray-500">Commerces visités</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <Tag size={18} className="text-vert mb-2" />
              <div className="text-2xl font-bold text-texte">{statsPerso.offresUtilisees}</div>
              <div className="text-xs text-gray-500">Offres utilisées</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <Users size={18} className="text-bleu mb-2" />
              <div className="text-2xl font-bold text-texte">{statsPerso.filleuls}</div>
              <div className="text-xs text-gray-500">Filleuls</div>
            </div>
          </div>
        </section>

        {/* Section parrainage */}
        <div className="mt-10">
          <ParrainageEspace />
        </div>

        {/* Actions rapides */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            to="/parametres"
            className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Settings size={16} />
            Modifier mon profil
          </Link>
          {profile?.ville_id && (
            <button
              onClick={() => setShowSignalement(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium border border-orange-300 text-orange-600 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <AlertTriangle size={16} />
              Signaler un problème
            </button>
          )}
        </div>

      </div>

      {/* Modal signalement */}
      {showSignalement && profile?.ville_id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowSignalement(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-texte flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Signaler un problème
              </h3>
              <button onClick={() => setShowSignalement(false)} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label="Fermer">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <SignalementForm
                villeId={profile.ville_id}
                profileId={profile.id}
                onSuccess={() => setShowSignalement(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
