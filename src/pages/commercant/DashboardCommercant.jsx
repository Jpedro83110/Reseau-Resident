// src/pages/commercant/DashboardCommercant.jsx
// Dashboard commerçant complet avec 9 onglets modulaires
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Tag, Calendar, Newspaper, BarChart2, Star, MessageCircle,
  FolderOpen, Megaphone, Crown,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

// Composants modulaires
import FicheCommerce from './components/FicheCommerce';
import GestionOffres from './components/GestionOffres';
import StatsCommerce from './components/StatsCommerce';
import AvisClients from './components/AvisClients';
import MessagesContact from './components/MessagesContact';
import CampagneLocale from './components/CampagneLocale';
import ProjetsVille from './components/ProjetsVille';
import GestionEvenements from '../../components/GestionEvenements';
import GestionActualites from '../../components/GestionActualites';

const ONGLETS = [
  { id: 'fiche', label: 'Ma fiche', icon: Store },
  { id: 'offres', label: 'Offres', icon: Tag },
  { id: 'stats', label: 'Stats', icon: BarChart2 },
  { id: 'avis', label: 'Avis', icon: Star },
  { id: 'evenements', label: 'Événements', icon: Calendar },
  { id: 'actualites', label: 'Actualités', icon: Newspaper },
  { id: 'projets', label: 'Projets', icon: FolderOpen },
  { id: 'campagnes', label: 'Campagnes', icon: Megaphone },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
];

export default function DashboardCommercant() {
  const { user } = useAuth();
  usePageMeta('Mon commerce');

  const [onglet, setOnglet] = useState('fiche');
  const [commerce, setCommerce] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    async function chargerCommerce() {
      try {
        setIsLoading(true);

        // 1. Chercher dans commercant_profiles
        const { data: profil } = await supabase
          .from('commercant_profiles')
          .select('commerce_id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profil?.commerce_id) {
          const { data: commerceData } = await supabase
            .from('commerces')
            .select('id, nom, categorie, adresse, telephone, avantage, actif, description, horaires, photos, site_web, siret, premium, ville_id, email_contact')
            .eq('id', profil.commerce_id)
            .maybeSingle();

          if (commerceData) {
            setCommerce(commerceData);
            return;
          }
        }

        // 2. Fallback : chercher par owner_id ou email dans commerces
        let byEmail = null;
        const { data: byOwner } = await supabase
          .from('commerces')
          .select('id, nom, categorie, adresse, telephone, avantage, actif, description, horaires, photos, site_web, siret, premium, ville_id, email_contact')
          .eq('owner_id', user.id)
          .maybeSingle();
        if (byOwner) {
          byEmail = byOwner;
        } else {
          const { data: byMail } = await supabase
            .from('commerces')
            .select('id, nom, categorie, adresse, telephone, avantage, actif, description, horaires, photos, site_web, siret, premium, ville_id, email_contact')
            .eq('email_contact', user.email)
            .maybeSingle();
          byEmail = byMail;
        }

        if (byEmail) {
          setCommerce(byEmail);
          // Auto-créer le lien commercant_profiles
          try {
            await supabase.from('commercant_profiles').insert({ id: user.id, commerce_id: byEmail.id, role: 'owner' });
          } catch { /* ignore si existe déjà */ }
          return;
        }

        // 3. Pas de commerce trouvé — vérifier si demande en cours
        const { data: demande } = await supabase
          .from('commercants_inscrits')
          .select('nom_commerce, statut')
          .eq('email', user.email)
          .maybeSingle();

        if (demande) {
          if (demande.statut === 'en_attente') {
            setError(`Votre demande pour "${demande.nom_commerce}" est en cours de validation. Vous recevrez un email dès qu'elle sera acceptée.`);
          } else if (demande.statut === 'refuse') {
            setError(`Votre demande pour "${demande.nom_commerce}" a été refusée. Contactez-nous pour plus d'informations.`);
          }
        } else {
          setError('Aucun commerce associé à votre compte. Faites une demande d\'adhésion.');
        }
      } catch (err) {
        setError('Erreur lors du chargement de votre commerce.');
        console.error('Erreur DashboardCommercant:', err);
      } finally {
        setIsLoading(false);
      }
    }

    chargerCommerce();
  }, [user]);

  function handleUpdate() {
    // Recharger les données du commerce après une modification
    if (commerce?.id) {
      supabase.from('commerces')
        .select('id, nom, categorie, adresse, telephone, avantage, actif, description, horaires, photos, site_web, siret, premium, ville_id, email_contact')
        .eq('id', commerce.id).maybeSingle()
        .then(({ data }) => { if (data) setCommerce(data); });
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Chargement de votre commerce…</p>
        </div>
      </div>
    );
  }

  // Erreur ou pas de commerce
  if (error || !commerce) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md mx-4">
          <Store size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-4">{error || 'Aucun commerce trouvé.'}</p>
          <a href="/commercants/rejoindre"
            className="inline-block px-5 py-2.5 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors text-sm">
            Rejoindre le réseau
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* En-tête */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-serif text-3xl font-bold text-texte">{commerce.nom}</h1>
            {commerce.premium && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-or text-white">Premium</span>
            )}
          </div>
          <p className="text-gray-500 text-sm flex items-center gap-1.5">
            <Store size={14} /> {commerce.categorie} · Réseaux-Résident
          </p>
        </motion.div>

        {/* Navigation onglets — scroll horizontal sur mobile */}
        <div className="mb-8 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-max">
            {ONGLETS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setOnglet(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  onglet === id ? 'bg-bleu text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu onglet */}
        <motion.div key={onglet} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {onglet === 'fiche' && <FicheCommerce commerce={commerce} onUpdate={handleUpdate} />}
          {onglet === 'offres' && <GestionOffres commerceId={commerce.id} categorie={commerce.categorie} />}
          {onglet === 'stats' && <StatsCommerce commerceId={commerce.id} />}
          {onglet === 'avis' && <AvisClients commerceId={commerce.id} />}
          {onglet === 'evenements' && <GestionEvenements organisateurType="commerce" organisateurId={commerce.id} villeId={commerce.ville_id} />}
          {onglet === 'actualites' && <GestionActualites auteurType="commerce" auteurId={commerce.id} villeId={commerce.ville_id} />}
          {onglet === 'projets' && <ProjetsVille villeId={commerce.ville_id} />}
          {onglet === 'campagnes' && <CampagneLocale commerceId={commerce.id} villeId={commerce.ville_id} />}
          {onglet === 'messages' && <MessagesContact userId={user.id} />}
        </motion.div>

      </div>
    </div>
  );
}
