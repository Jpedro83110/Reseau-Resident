# CLAUDE.md — Configuration Claude Code pour Réseaux-Résident

> Ce fichier est la source de vérité absolue pour tout travail effectué par Claude Code sur ce projet.
> Lis ce fichier en entier avant chaque session de travail. Ne fais jamais d'hypothèse qui contredit ce document.

---

## 1. IDENTITÉ DU PROJET

**Nom** : Réseaux-Résident
**Positionnement** : Plateforme SaaS de vie locale qui connecte résidents, commerçants, associations/clubs et mairies dans une boucle territoriale unique.
**Ce n'est PAS** : une simple carte de fidélité locale, ni un annuaire de commerces, ni une app touristique.
**Ce que c'est** : un hub territorial connecté avec quatre dashboards distincts (résident, commerçant, association/club, mairie) et une interconnexion native avec les verticales SimplyFoot et SimplyRugby.

**Ville pilote** : Sanary-sur-Mer (Var, PACA)
**Nom de code interne de l'existant** : carte-resident (l'ancien projet qu'on fait évoluer)

---

## 2. STACK TECHNIQUE — VÉRITÉ UNIQUE

### Frontend
| Technologie | Version | Rôle |
|---|---|---|
| React | 18.3.x | Framework UI — ne PAS upgrader vers 19 sans instruction explicite |
| React Router DOM | 6.22.x | Routing SPA |
| Vite | 5.2.x | Bundler + dev server (port 3000) |
| TailwindCSS | 3.4.x | Styling utilitaire |
| PostCSS + Autoprefixer | config existante | Post-processing CSS |
| Framer Motion | 11.x | Animations |
| Lucide React | 0.363.x | Icônes |
| Recharts | 2.12.x | Graphiques / dataviz |
| QRCode | 1.5.x | Génération QR codes |

### Backend / Services
| Technologie | Rôle |
|---|---|
| Supabase | BDD PostgreSQL, Auth, RLS, Edge Functions, Storage |
| Stripe | Paiements (cartes physiques, premium futur) |
| Vercel | Hébergement + Serverless Functions (dossier `/api`) |

### APIs publiques à intégrer
| API | URL | Usage |
|---|---|---|
| API Sirene (INSEE) | `https://api.insee.fr/entreprises/sirene/V3.11` | Vérification / auto-complétion commerces |
| API Associations (RNA) | `https://entreprise.api.gouv.fr/v4/djepva/api-association` | Récupération infos associations |
| geo.api.gouv.fr | `https://geo.api.gouv.fr` | Découpage admin, communes, codes postaux |
| API Adresse (BAN) | `https://api-adresse.data.gouv.fr` | Autocomplétion adresses (DÉJÀ utilisée) |
| OpenAgenda | `https://api.openagenda.com/v2` | Agenda événementiel territorial |
| Data.Subvention | `https://datasubvention.beta.gouv.fr/api` | Données subventions associatives (mairie) |
| SimplyFoot API | À construire | Projets clubs foot, événements, équipes |
| SimplyRugby API | À construire | Projets clubs rugby, événements, équipes |

### PWA
Le projet est une Progressive Web App. Fichiers existants :
- `/public/manifest.webmanifest`
- `/public/sw.js`
- `/public/icon-192.png`, `icon-512.png`
- Hook : `src/hooks/usePWA.js`
- Composant : `src/components/InstallBanner.jsx`

---

## 3. ARCHITECTURE FICHIERS — CONVENTION STRICTE

```
/
├── api/                          # Vercel Serverless Functions (Node.js)
│   ├── admin-action.js
│   ├── create-payment-intent.js
│   ├── send-confirmation-email.js
│   └── stripe-webhook.js
├── public/                       # Assets statiques PWA
├── src/
│   ├── main.jsx                  # Point d'entrée React
│   ├── App.jsx                   # Router principal
│   ├── index.css                 # Styles globaux + Tailwind directives
│   ├── components/               # Composants réutilisables (shared)
│   │   ├── index.jsx             # Barrel exports
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── AutocompleteAdresse.jsx
│   │   ├── AutocompleteVille.jsx
│   │   └── InstallBanner.jsx
│   ├── hooks/                    # Custom hooks
│   │   ├── useData.js
│   │   └── usePWA.js
│   ├── lib/                      # Clients et utilitaires
│   │   ├── supabase.js           # Client Supabase
│   │   ├── stripe.js             # Client Stripe
│   │   ├── api.js                # Appels API internes
│   │   └── adresse-gouv.js       # Client API Adresse BAN
│   └── pages/                    # Pages par domaine
│       ├── Home.jsx
│       ├── CGV.jsx
│       ├── Confidentialite.jsx
│       ├── MonCommerce.jsx
│       ├── MonEspace.jsx
│       ├── Resilier.jsx
│       ├── RetirerCommerce.jsx
│       ├── commercants/
│       │   ├── Commercants.jsx
│       │   └── Rejoindre.jsx
│       ├── dashboard/
│       │   └── Dashboard.jsx     # ADMIN dashboard existant
│       ├── inscription/
│       │   └── Inscription.jsx
│       ├── scan/
│       │   └── Scan.jsx
│       └── villes/
│           └── Ville.jsx
├── supabase-schema.sql           # Schéma BDD v2.0 actuel
├── migration-v3.sql              # Migrations
├── migration-v3.1.sql
├── patch-v2.1.sql ... v2.4.sql   # Patches historiques
├── vercel.json                   # Config déploiement Vercel
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

### Règles d'organisation des fichiers

1. **Nouveaux domaines** → créer un sous-dossier dans `src/pages/` :
   - `src/pages/resident/` — Dashboard résident, profil, carte, favoris, parrainage
   - `src/pages/commercant/` — Dashboard commerçant, fiche, offres, stats
   - `src/pages/association/` — Dashboard asso/club, projets, annonces
   - `src/pages/mairie/` — Dashboard mairie, stats territoire, back-office
   - `src/pages/auth/` — Login, inscription, mot de passe oublié

2. **Composants partagés** → `src/components/`
3. **Composants spécifiques à un domaine** → `src/pages/[domaine]/components/`
4. **Nouveaux hooks** → `src/hooks/`
5. **Nouveaux clients API** → `src/lib/`
6. **Nouvelles serverless functions** → `api/`
7. **Migrations BDD** → racine, nommées `migration-vX.Y.sql`

---

## 4. BASE DE DONNÉES — SCHÉMA ACTUEL ET ÉVOLUTION

### Tables existantes (Supabase PostgreSQL)
```
admins              — Admins avec rôles (admin, super_admin)
villes              — Villes avec statut (actif/bientot), compteurs dénormalisés
commerces           — Commerces rattachés à une ville, avec avantage et compteur visites
cartes              — Cartes résidents (physique/digitale/les_deux), formules, statut paiement
visites             — Log des scans (QR, code mensuel, carnet, téléphone, NFC, admin)
commercants_inscrits — Demandes d'inscription commerçants (en_attente/valide/refuse)
liste_attente       — Emails en attente par ville
cartes_cadeaux      — Cartes cadeaux avec solde
utilisations_cadeaux — Utilisations de cartes cadeaux
codes_mensuels      — Codes mensuels par commerce
```

### RLS actif
Toutes les tables ont Row Level Security activé. Les policies utilisent `is_admin()` (SECURITY DEFINER) pour vérifier les droits admin.

### Fonctions RPC existantes
- `get_stats_mensuelles(p_ville_id)` — Stats visites 6 derniers mois
- `get_carte_by_qr(p_qr_token)` — Recherche carte par QR token

### Triggers existants
- `trg_cartes_updated_at` — Auto-update `updated_at`
- `trg_sync_cartes_actives` — Compteur cartes actives dans `villes`
- `trg_sync_visites` — Compteur visites dans `villes` et `commerces`
- `trg_sync_commerces_partenaires` — Compteur commerces dans `villes`
- `trg_sync_solde_cadeau` — Mise à jour solde carte cadeau

### NOUVELLES TABLES À CRÉER (évolution vers Réseaux-Résident)

> Quand je te demande de créer la migration, suis exactement cette structure.

```sql
-- PROFILS RÉSIDENTS (lié à auth.users)
profiles (
  id UUID PK → auth.users(id),
  ville_id UUID → villes(id),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  adresse TEXT,
  code_parrainage TEXT UNIQUE,
  parrain_id UUID → profiles(id),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- COMPTES COMMERÇANTS (lié à auth.users)
commercant_profiles (
  id UUID PK → auth.users(id),
  commerce_id UUID → commerces(id),
  role TEXT CHECK ('owner', 'manager', 'staff'),
  created_at TIMESTAMPTZ
)

-- OFFRES COMMERÇANTS
offres (
  id UUID PK,
  commerce_id UUID → commerces(id),
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK ('reduction', 'cadeau', 'offre_speciale', 'programme_fidelite'),
  valeur TEXT,
  conditions TEXT,
  date_debut TIMESTAMPTZ,
  date_fin TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  utilisations_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
)

-- UTILISATIONS D'OFFRES
utilisations_offres (
  id UUID PK,
  offre_id UUID → offres(id),
  profile_id UUID → profiles(id),
  commerce_id UUID → commerces(id),
  date_utilisation TIMESTAMPTZ
)

-- ÉVÉNEMENTS
evenements (
  id UUID PK,
  ville_id UUID → villes(id),
  organisateur_type TEXT CHECK ('mairie', 'commerce', 'association', 'club'),
  organisateur_id UUID,
  titre TEXT NOT NULL,
  description TEXT,
  lieu TEXT,
  adresse TEXT,
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ,
  image_url TEXT,
  categorie TEXT,
  gratuit BOOLEAN DEFAULT TRUE,
  prix DECIMAL,
  lien_externe TEXT,
  openagenda_id TEXT,
  statut TEXT CHECK ('brouillon', 'publie', 'annule', 'termine') DEFAULT 'brouillon',
  created_at TIMESTAMPTZ
)

-- ACTUALITÉS
actualites (
  id UUID PK,
  ville_id UUID → villes(id),
  auteur_type TEXT CHECK ('mairie', 'commerce', 'association', 'club', 'admin'),
  auteur_id UUID,
  titre TEXT NOT NULL,
  contenu TEXT NOT NULL,
  image_url TEXT,
  categorie TEXT,
  epingle BOOLEAN DEFAULT FALSE,
  publie BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
)

-- ASSOCIATIONS / CLUBS
associations (
  id UUID PK,
  ville_id UUID → villes(id),
  nom TEXT NOT NULL,
  description TEXT,
  categorie TEXT NOT NULL,
  adresse TEXT,
  email TEXT,
  telephone TEXT,
  site_web TEXT,
  logo_url TEXT,
  numero_rna TEXT,
  numero_siret TEXT,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
)

-- COMPTES ASSOCIATIONS (lié à auth.users)
association_profiles (
  id UUID PK → auth.users(id),
  association_id UUID → associations(id),
  role TEXT CHECK ('president', 'admin', 'membre'),
  created_at TIMESTAMPTZ
)

-- PROJETS ASSOCIATIFS (le cœur différenciant)
projets (
  id UUID PK,
  association_id UUID → associations(id),
  ville_id UUID → villes(id),
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  objectif_montant DECIMAL,
  montant_collecte DECIMAL DEFAULT 0,
  objectif_description TEXT,
  paliers JSONB,          -- ex: [{"montant":100,"description":"10 ballons"},{"montant":250,"description":"1 déplacement"}]
  image_url TEXT,
  date_limite TIMESTAMPTZ,
  statut TEXT CHECK ('brouillon', 'actif', 'atteint', 'cloture') DEFAULT 'brouillon',
  source TEXT CHECK ('local', 'simplyfot', 'simplyrugby') DEFAULT 'local',
  source_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- SOUTIENS AUX PROJETS
soutiens (
  id UUID PK,
  projet_id UUID → projets(id),
  soutien_type TEXT CHECK ('resident', 'commerce', 'mairie'),
  soutien_id UUID,
  montant DECIMAL,
  message TEXT,
  anonyme BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
)

-- COMPTES MAIRIE (lié à auth.users)
mairie_profiles (
  id UUID PK → auth.users(id),
  ville_id UUID → villes(id),
  role TEXT CHECK ('elu', 'directeur', 'agent'),
  service TEXT,
  created_at TIMESTAMPTZ
)

-- FAVORIS RÉSIDENTS
favoris (
  id UUID PK,
  profile_id UUID → profiles(id),
  favori_type TEXT CHECK ('commerce', 'association', 'evenement'),
  favori_id UUID,
  created_at TIMESTAMPTZ,
  UNIQUE(profile_id, favori_type, favori_id)
)

-- NOTIFICATIONS
notifications (
  id UUID PK,
  destinataire_id UUID → auth.users(id),
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK ('offre', 'evenement', 'projet', 'actualite', 'systeme'),
  lien TEXT,
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
)

-- PARRAINAGES
parrainages (
  id UUID PK,
  parrain_id UUID → profiles(id),
  filleul_id UUID → profiles(id),
  statut TEXT CHECK ('en_attente', 'valide') DEFAULT 'en_attente',
  created_at TIMESTAMPTZ
)

-- CAMPAGNES LOCALES (commerçants premium futur)
campagnes (
  id UUID PK,
  commerce_id UUID → commerces(id),
  ville_id UUID → villes(id),
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK ('mise_en_avant', 'notification_push', 'banniere'),
  date_debut TIMESTAMPTZ,
  date_fin TIMESTAMPTZ,
  budget DECIMAL,
  statut TEXT CHECK ('brouillon', 'active', 'terminee') DEFAULT 'brouillon',
  impressions INTEGER DEFAULT 0,
  clics INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
)

-- EXTENSIONS TABLE COMMERCES (colonnes à ajouter)
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS
  description TEXT,
  horaires JSONB,
  photos JSONB DEFAULT '[]',
  site_web TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  siret TEXT,
  premium BOOLEAN DEFAULT FALSE,
  premium_depuis TIMESTAMPTZ,
  owner_id UUID → auth.users(id);

-- EXTENSIONS TABLE VILLES (colonnes à ajouter)
ALTER TABLE villes ADD COLUMN IF NOT EXISTS
  associations_count INTEGER DEFAULT 0,
  evenements_count INTEGER DEFAULT 0,
  projets_actifs_count INTEGER DEFAULT 0,
  population INTEGER,
  code_postal TEXT,
  code_insee TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  logo_url TEXT,
  site_web TEXT;
```

### Règles BDD strictes

1. **Toujours** écrire les migrations en SQL pur (pas d'ORM)
2. **Toujours** activer RLS sur les nouvelles tables
3. **Toujours** créer des policies RLS adaptées au rôle (anon, authenticated, admin, service_role)
4. **Toujours** ajouter les indexes pertinents
5. **Toujours** utiliser `uuid_generate_v4()` pour les PK
6. **Toujours** utiliser `TIMESTAMPTZ` (jamais TIMESTAMP)
7. **Toujours** mettre des `CHECK` constraints sur les colonnes à valeurs contraintes
8. **Jamais** de `CASCADE` sur les FK vers `auth.users` sauf pour les profiles
9. **Toujours** nommer les fichiers migration `migration-vX.Y.sql`

---

## 5. CONVENTIONS DE CODE — LOI ABSOLUE

### JavaScript / React

```javascript
// ✅ Composants : PascalCase, fichiers .jsx
export default function DashboardResident() { ... }

// ✅ Hooks : camelCase, préfixe use, fichiers .js
export function useResident() { ... }

// ✅ Libs / utils : camelCase, fichiers .js
export function fetchCommercesParVille(villeId) { ... }

// ✅ Constantes : UPPER_SNAKE_CASE
const MAX_OFFRES_GRATUITES = 3;

// ✅ Props : camelCase
<CarteResident villeId={id} onScan={handleScan} />

// ✅ Événements : handle + Action
const handleSubmitOffre = () => { ... };

// ✅ State : descriptif
const [offres, setOffres] = useState([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
```

### Pattern de chargement de données

```javascript
// ✅ Pattern standard pour toute page/composant avec données Supabase
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MaPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('table')
          .select('*')
          .eq('ville_id', villeId);
        if (error) throw error;
        setData(data);
      } catch (err) {
        setError(err.message);
        console.error('Erreur chargement:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [villeId]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  return ( /* ... */ );
}
```

### Tailwind CSS

```jsx
// ✅ Couleurs du design system (à définir dans tailwind.config.js)
// Primaire : bleu territorial — #2563EB (blue-600)
// Secondaire : vert engagement — #059669 (emerald-600)
// Accent : orange énergie — #EA580C (orange-600)
// Fond : gray-50 (#F9FAFB)
// Texte : gray-900 (#111827)

// ✅ Responsive : mobile-first TOUJOURS
<div className="px-4 md:px-6 lg:px-8">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ Pas de CSS custom sauf cas extrême — tout en Tailwind utilities
// ✅ Pas de @apply dans index.css sauf pour les composants de base
```

### Imports

```javascript
// ✅ Ordre strict des imports
// 1. React et dépendances React
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// 2. Librairies tierces
import { motion } from 'framer-motion';
import { MapPin, Calendar, Heart } from 'lucide-react';

// 3. Lib internes
import { supabase } from '../../lib/supabase';

// 4. Composants
import { Layout, LoadingSpinner } from '../../components';

// 5. Composants locaux
import ProjetCard from './components/ProjetCard';
```

---

## 6. ARCHITECTURE DES 4 DASHBOARDS

### 6.1 Dashboard Résident (`/mon-espace`)
**Accès** : Résident authentifié (auth.users + profiles)
**Composants clés** :
- CarteDIgitale — Affichage QR code personnel + infos
- CommercesProches — Liste filtrée par ville, avec offres
- OffresDisponibles — Réductions actives triées par pertinence
- AgendaLocal — Événements à venir (ville + OpenAgenda)
- ActualitesVille — Flux d'actus mairie + commerces + assos
- ProjetsLocaux — Projets asso à soutenir avec paliers concrets
- ClubsAssociations — Annuaire asso/clubs de la ville
- HistoriqueAvantages — Log des offres utilisées
- FavorisCommerce — Commerces sauvegardés
- NotificationsUtiles — Centre de notifications
- ProfilResident — Ville de rattachement, préférences
- ParrainageEspace — Code + historique parrainages
- DecouvrirVille — Parcours découverte gamifié

### 6.2 Dashboard Commerçant (`/mon-commerce`)
**Accès** : Commerçant authentifié (auth.users + commercant_profiles)
**Composants clés** :
- FicheCommerce — Infos, horaires, photos, contact
- GestionOffres — CRUD offres et avantages
- ActualitesCommerce — Publication d'actus du commerce
- EvenementsCommerce — Événements organisés
- StatsSimples — Vues, clics, scans, utilisations d'offres (Recharts)
- ProjetsAssociatifs — Liste projets de la ville à soutenir/sponsoriser
- CampagneLocale — Module push offre hors saison (premium futur)
- ContactPlateforme — Messagerie avec équipe Réseaux-Résident

### 6.3 Dashboard Association/Club (`/mon-association`)
**Accès** : Responsable asso authentifié (auth.users + association_profiles)
**Composants clés** :
- FicheAssociation — Infos, logo, contact, catégorie
- CreerProjet — Formulaire projet avec paliers concrets
- MesProjets — Liste + état d'avancement
- SuivisSoutiens — Tableau des soutiens reçus
- PublierAnnonce — Publication dans le flux local
- EvenementsAsso — Événements du club/asso

### 6.4 Dashboard Mairie (`/mairie`)
**Accès** : Agent/élu authentifié (auth.users + mairie_profiles)
**Composants clés** :
- VueEnsemble — KPIs : résidents, commerces, assos, événements, offres, projets
- CartographieTerritoriale — Carte des commerces et points d'activité
- StatsUsage — Graphiques d'engagement (Recharts)
- QuartiersActifs — Zones les plus dynamiques
- BackOfficeActualites — CRUD actus de ville
- BackOfficeAgenda — CRUD événements territoriaux
- GestionProjetsLocaux — Vue projets en cours + montants générés
- CampagnesVille — Opérations saisonnières
- ExportBilans — Export CSV/PDF des données
- AssistantImpact — (futur) résumé IA mensuel

---

## 7. ROUTING — STRUCTURE COMPLÈTE

```javascript
// src/App.jsx — structure cible
<Routes>
  {/* Pages publiques */}
  <Route path="/" element={<Home />} />
  <Route path="/villes/:slug" element={<Ville />} />
  <Route path="/commercants" element={<Commercants />} />
  <Route path="/commercants/rejoindre" element={<Rejoindre />} />
  <Route path="/inscription" element={<Inscription />} />
  <Route path="/cgv" element={<CGV />} />
  <Route path="/confidentialite" element={<Confidentialite />} />

  {/* Auth */}
  <Route path="/connexion" element={<Connexion />} />
  <Route path="/inscription-compte" element={<InscriptionCompte />} />
  <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />

  {/* Dashboard Résident (protégé) */}
  <Route path="/mon-espace" element={<ProtectedRoute role="resident"><DashboardResident /></ProtectedRoute>} />
  <Route path="/mon-espace/carte" element={<ProtectedRoute role="resident"><MaCarte /></ProtectedRoute>} />
  <Route path="/mon-espace/favoris" element={<ProtectedRoute role="resident"><MesFavoris /></ProtectedRoute>} />
  <Route path="/mon-espace/parrainage" element={<ProtectedRoute role="resident"><Parrainage /></ProtectedRoute>} />
  <Route path="/mon-espace/profil" element={<ProtectedRoute role="resident"><ProfilResident /></ProtectedRoute>} />

  {/* Dashboard Commerçant (protégé) */}
  <Route path="/mon-commerce" element={<ProtectedRoute role="commercant"><DashboardCommercant /></ProtectedRoute>} />
  <Route path="/mon-commerce/offres" element={<ProtectedRoute role="commercant"><GestionOffres /></ProtectedRoute>} />
  <Route path="/mon-commerce/stats" element={<ProtectedRoute role="commercant"><StatsCommerce /></ProtectedRoute>} />

  {/* Dashboard Association (protégé) */}
  <Route path="/mon-association" element={<ProtectedRoute role="association"><DashboardAssociation /></ProtectedRoute>} />
  <Route path="/mon-association/projets/nouveau" element={<ProtectedRoute role="association"><CreerProjet /></ProtectedRoute>} />
  <Route path="/mon-association/projets/:id" element={<ProtectedRoute role="association"><DetailProjet /></ProtectedRoute>} />

  {/* Dashboard Mairie (protégé) */}
  <Route path="/mairie" element={<ProtectedRoute role="mairie"><DashboardMairie /></ProtectedRoute>} />
  <Route path="/mairie/actualites" element={<ProtectedRoute role="mairie"><BackOfficeActualites /></ProtectedRoute>} />
  <Route path="/mairie/agenda" element={<ProtectedRoute role="mairie"><BackOfficeAgenda /></ProtectedRoute>} />
  <Route path="/mairie/export" element={<ProtectedRoute role="mairie"><ExportBilans /></ProtectedRoute>} />

  {/* Admin existant */}
  <Route path="/dashboard" element={<ProtectedRoute role="admin"><Dashboard /></ProtectedRoute>} />

  {/* Scan QR public */}
  <Route path="/scan" element={<Scan />} />

  {/* 404 */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 8. AUTHENTIFICATION — ARCHITECTURE MULTI-RÔLE

### Logique
Supabase Auth gère l'authentification. Le rôle est déterminé par la table de profil dans laquelle l'utilisateur existe :

```
auth.users(id)
  ├── profiles         → résident
  ├── commercant_profiles → commerçant
  ├── association_profiles → responsable asso
  ├── mairie_profiles  → agent/élu mairie
  └── admins           → admin plateforme
```

Un même `auth.users(id)` PEUT avoir plusieurs rôles (ex : un commerçant est aussi résident).

### Hook d'auth à créer

```javascript
// src/hooks/useAuth.js
// Doit exposer :
// - user (auth.users)
// - profile (profiles row)
// - roles : ['resident', 'commercant', 'association', 'mairie', 'admin']
// - isLoading
// - signIn(email, password)
// - signUp(email, password, metadata)
// - signOut()
// - hasRole(role) → boolean
```

### Composant ProtectedRoute à créer

```javascript
// src/components/ProtectedRoute.jsx
// - Vérifie auth
// - Vérifie rôle
// - Redirige vers /connexion si pas auth
// - Redirige vers /mon-espace si auth mais mauvais rôle
```

---

## 9. INTÉGRATION APIs PUBLIQUES — GUIDE

### API Sirene (INSEE)
- **Usage** : Quand un commerçant s'inscrit, auto-complétion par SIRET ou nom
- **Client** : `src/lib/sirene.js`
- **Auth** : Bearer token (variable env `VITE_INSEE_API_KEY`)
- **Endpoint principal** : `GET /siret/{siret}` ou recherche `GET /siren?q=...`

### API Associations (RNA)
- **Usage** : Quand une asso s'inscrit, vérification par numéro RNA
- **Client** : `src/lib/associations-api.js`
- **Endpoint** : `GET /v4/djepva/api-association/associations/{rna}`

### geo.api.gouv.fr
- **Usage** : Liste communes, codes postaux, départements
- **Client** : DÉJÀ partiellement dans `src/lib/adresse-gouv.js`
- **Endpoints** : `/communes?nom=...`, `/communes?codePostal=...`

### OpenAgenda
- **Usage** : Synchronisation événements territoire
- **Client** : `src/lib/openagenda.js`
- **Auth** : API key (`VITE_OPENAGENDA_KEY`)
- **Endpoint** : `GET /v2/agendas/{uid}/events`

---

## 10. MODÈLE ÉCONOMIQUE — RÈGLES BUSINESS À ENCODER

### Phase pilote (ville de Sanary)
```
Résident         → 100% GRATUIT (carte digitale)
Carte physique   → 2,99€ à 4,99€ (optionnel)
Commerçant       → 100% GRATUIT (fiche + 1 offre + visibilité carte)
Association/Club → 100% GRATUIT (profil + projets + annonces)
Mairie           → Partenariat (communication + caution institutionnelle)
```

### Phase monétisation (post-adoption)
```
Commerçant Premium     → 9,90€ ou 14,90€/mois
  - Stats avancées
  - Mise en avant (boost)
  - Campagne hors saison
  - Badge "commerce engagé"
  - Notifications push ciblées
  - Sponsoring projet local

Mairie déployée        → Abonnement territorial (à négocier)
  - Dashboard complet
  - Export bilans
  - Assistant IA impact
  - Campagnes ville
```

### Implications techniques
- Le champ `commerces.premium` contrôle l'accès aux fonctionnalités payantes
- Le Stripe existant gère les paiements cartes physiques, à étendre pour les abonnements premium
- Les fonctionnalités premium doivent être visibles mais verrouillées (UI "upgrade" clair)

---

## 11. INTERCONNEXION SimplyFoot / SimplyRugby

### Architecture API
```
SimplyFoot API ──→ Réseaux-Résident
  POST /api/sync/projet      — Publier un projet club sur RR
  POST /api/sync/evenement   — Publier un événement sportif sur RR
  GET  /api/sync/ville/:id   — Récupérer les infos ville pour SF

SimplyRugby API ──→ Réseaux-Résident
  Mêmes endpoints, même logique

Réseaux-Résident ──→ SimplyFoot/SimplyRugby
  POST /api/notify/club      — Pousser une annonce locale vers les clubs concernés
```

### Champ `source` dans les tables
- `projets.source` : `'local'` | `'simplyfot'` | `'simplyrugby'`
- `projets.source_id` : ID du projet dans la plateforme source
- `evenements.organisateur_type` : inclut les clubs sportifs

### Sécurité
- API Key partagée entre les plateformes (variable env `RR_SYNC_API_KEY`)
- Validation côté serverless function (`api/sync-*.js`)

---

## 12. VARIABLES D'ENVIRONNEMENT

### Fichier `.env.local` (frontend Vite)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLIC_KEY=pk_...
VITE_INSEE_API_KEY=...
VITE_OPENAGENDA_KEY=...
VITE_APP_URL=https://reseaux-resident.fr
```

### Variables Vercel (serverless)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RR_SYNC_API_KEY=...
```

### Règle absolue
- **JAMAIS** de clé secrète dans le code source
- **JAMAIS** de `SUPABASE_SERVICE_ROLE_KEY` côté frontend
- Toute opération admin passe par les serverless functions (`/api`)

---

## 13. PLAN DE DÉVELOPPEMENT PAR PHASES

### Phase 1 — Fondations (PRIORITÉ)
1. Migration BDD : créer toutes les nouvelles tables + RLS
2. Système d'auth multi-rôle (useAuth + ProtectedRoute)
3. Page connexion / inscription avec choix de rôle
4. Refactor de la Navbar pour navigation contextuelle par rôle
5. Dashboard résident minimal (carte + commerces + offres)

### Phase 2 — Cœur fonctionnel
6. Dashboard commerçant (fiche + offres + stats basiques)
7. Dashboard association (profil + création projet avec paliers)
8. Système d'offres et d'utilisation
9. Système d'événements
10. Système d'actualités

### Phase 3 — Différenciation
11. Dashboard mairie (KPIs + cartographie + back-offices)
12. Module projets avec paliers et soutiens
13. Intégration API Sirene + API Associations
14. Intégration OpenAgenda
15. Système de favoris et notifications

### Phase 4 — Monétisation et scale
16. Premium commerçant (Stripe Subscriptions)
17. Campagnes locales sponsorisées
18. API de synchronisation SimplyFoot / SimplyRugby
19. Export bilans mairie
20. Parrainage résident

---

## 14. RÈGLES DE TRAVAIL CLAUDE CODE

### Avant chaque tâche
1. Lis ce fichier CLAUDE.md
2. Identifie la phase et le numéro de tâche
3. Vérifie quels fichiers existants sont impactés
4. Demande confirmation avant de modifier un fichier existant critique (App.jsx, supabase.js, etc.)

### Pendant le développement
1. **Un fichier = une responsabilité** — pas de composants géants
2. **Mobile-first** — toujours tester les styles en 375px d'abord
3. **Pas d'over-engineering** — composants simples, state local, Supabase direct
4. **Pas de state management global** — useState/useEffect suffisent pour cette taille de projet. Si un state partagé est nécessaire, utiliser React Context, pas Redux/Zustand
5. **Commentaires en français** dans le code
6. **Console.error** pour les erreurs, jamais de `console.log` en prod
7. **Toujours** gérer les 3 états : loading, error, success
8. **Toujours** des messages d'erreur en français pour l'utilisateur

### Création de migration SQL
```sql
-- migration-vX.Y.sql
-- Description : [ce que fait cette migration]
-- Date : [date]
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

-- [contenu]

COMMIT;
```

### Création de serverless function (Vercel)
```javascript
// api/nom-fonction.js
// Description : [ce que fait cette fonction]
// Méthode : POST
// Auth : [Bearer token / Stripe webhook / public]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ...
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur [nom-fonction]:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
```

### Tests manuels
Après chaque modification :
1. Vérifier que `npm run dev` démarre sans erreur
2. Vérifier la console navigateur (0 erreurs)
3. Vérifier le responsive (375px, 768px, 1280px)
4. Vérifier les interactions Supabase (Network tab)

---

## 15. DESIGN SYSTEM — CHARTE VISUELLE

### Palette
```
Primaire :     #2563EB (blue-600) — Confiance, territoire
Primaire dark: #1D4ED8 (blue-700) — Hover, active
Secondaire :   #059669 (emerald-600) — Engagement, succès
Accent :       #EA580C (orange-600) — Énergie, CTA secondaire
Fond :         #F9FAFB (gray-50)
Fond carte :   #FFFFFF
Texte :        #111827 (gray-900)
Texte léger :  #6B7280 (gray-500)
Bordure :      #E5E7EB (gray-200)
Erreur :       #DC2626 (red-600)
Warning :      #D97706 (amber-600)
```

### Typographie
```
Font : système (font-sans Tailwind = -apple-system, BlinkMacSystemFont, Segoe UI, Roboto...)
Titres pages : text-2xl font-bold text-gray-900
Sous-titres : text-lg font-semibold text-gray-900
Corps : text-base text-gray-700
Labels : text-sm font-medium text-gray-700
Captions : text-xs text-gray-500
```

### Composants UI récurrents
```
Cards :          bg-white rounded-xl shadow-sm border border-gray-200 p-6
Bouton primaire: bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium
Bouton secondaire: border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg
Input :          border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
Badge :          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
```

### Animations
```
Entrée page :   framer-motion initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
Transition :    transition={{ duration: 0.3 }}
Hover card :    hover:shadow-md transition-shadow
```

---

## 16. SÉCURITÉ — CHECKLIST

- [ ] RLS activé sur TOUTES les tables
- [ ] Policies RLS testées pour chaque rôle (anon, authenticated, admin, service_role)
- [ ] Pas de `service_role_key` côté frontend
- [ ] Validation des inputs côté serveur (serverless functions)
- [ ] Rate limiting sur les endpoints sensibles
- [ ] CORS configuré dans vercel.json
- [ ] Webhook Stripe vérifié avec `stripe.webhooks.constructEvent`
- [ ] Tokens JWT vérifiés dans les serverless functions
- [ ] Sanitization des données utilisateur avant affichage
- [ ] Pas de `dangerouslySetInnerHTML` sans sanitization

---

## 17. GLOSSAIRE MÉTIER

| Terme | Signification |
|---|---|
| Carte digitale | QR code personnel du résident dans l'app (GRATUIT) |
| Carte physique | Carte plastique optionnelle avec QR statique (payant) |
| Formule | Type de carte : individuel, couple, famille, secondaire |
| Offre | Avantage proposé par un commerçant (réduction, cadeau...) |
| Projet | Demande de soutien d'une association avec paliers concrets |
| Palier | Seuil de montant avec description concrète (100€ = 10 ballons) |
| Soutien | Contribution financière ou matérielle à un projet |
| Campagne | Opération promotionnelle payante d'un commerçant premium |
| Scan | Passage de la carte chez un commerçant (validation visite) |
| Visite | Enregistrement d'un scan dans la BDD |
| Premium | Statut payant commerçant avec fonctionnalités avancées |
| Ville pilote | Première ville déployée (Sanary-sur-Mer) |
| Hub territorial | Concept de plateforme centralisatrice pour la vie locale |

---

## 18. CONTEXTE CONCURRENTIEL (pour les décisions UX)

| Concurrent | Ce qu'il fait | Ce que RR fait de plus |
|---|---|---|
| Myloope | Carte unique physique+digitale | + Mairie + Assos + Projets + API SimplyFoot/Rugby |
| Boutic | App ville-commerce-tourisme | + Projets associatifs + Dashboard mairie + interconnexion clubs |
| Shoop City | App "tout en un" territoire | + Couche projets avec paliers + API sync verticales sport |

**Positionnement différenciant** : Réseaux-Résident est le seul à connecter les 4 acteurs (résidents, commerçants, assos/clubs, mairie) dans une boucle circulaire avec des projets concrets et une interconnexion native aux verticales sport.

---

## 19. COMMANDES UTILES

```bash
# Dev
npm run dev                    # Lance Vite sur port 3000
npm run build                  # Build production
npm run preview                # Preview du build

# Supabase
# Toutes les migrations se font via Supabase Dashboard > SQL Editor
# Pas de CLI Supabase local pour l'instant

# Déploiement
# Push sur main → Vercel auto-deploy
```

---

## FIN DU DOCUMENT

Ce fichier est vivant. Mets-le à jour à chaque évolution majeure du projet.
Dernière mise à jour : Mars 2026 — Transition Carte Résident → Réseaux-Résident.
