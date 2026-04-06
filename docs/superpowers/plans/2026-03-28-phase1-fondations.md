# Phase 1 — Fondations Réseaux-Résident

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations de Réseaux-Résident : migration BDD complète, système d'auth multi-rôle avec Supabase, pages de connexion/inscription, Navbar contextuelle, et dashboard résident minimal.

**Architecture:** Supabase Auth gère l'authentification. Un React Context (`AuthContext`) détecte les rôles en interrogeant les tables de profil (`profiles`, `commercant_profiles`, etc.). Un composant `ProtectedRoute` protège les routes par rôle. Le dashboard résident récupère les données depuis Supabase directement (pas de store global).

**Tech Stack:** React 18.3, React Router DOM 6.22, Supabase JS v2, TailwindCSS 3.4, Framer Motion 11, Lucide React 0.363. Couleurs custom Tailwind : `bleu` (#1a3a5c), `or` (#c8963e), `creme` (#faf7f2), `texte` (#1c1c1c), `vert` (#2d7a4f), `bleu-clair` (#2a5298).

---

## Contexte important à lire avant de commencer

- **Fichier de config absolu :** `CLAUDE.md` à la racine — toute décision qui n'est pas dans ce plan doit respecter ce fichier.
- **Client Supabase :** `src/lib/supabase.js` — `export const supabase = createClient(...)` déjà configuré.
- **Composants partagés :** `src/components/index.jsx` — exports `CarteDigitale`, `CarteVisuelle`, `CommercantCard`, etc. Ces composants utilisent les couleurs custom Tailwind ci-dessus.
- **Routeur :** `src/App.jsx` — toutes les routes sont enfants d'un `<Route path="/" element={<Layout />}>`. Le `Layout` rend `<Outlet />` entre `<Navbar>` et `<Footer>`.
- **Pas de git dans ce projet** — pas d'étape de commit.
- **Migration SQL :** s'exécute dans Supabase Dashboard → SQL Editor, pas en CLI.
- **Vérification dev :** `npm run dev` lance Vite sur le port 3000.

---

## Structure des fichiers — vue d'ensemble

```
Créer :
  migration-v3.2.sql                          ← Task 1
  src/contexts/AuthContext.jsx                ← Task 2
  src/hooks/useAuth.js                        ← Task 3
  src/components/ProtectedRoute.jsx           ← Task 4
  src/pages/auth/Connexion.jsx                ← Task 6
  src/pages/auth/InscriptionCompte.jsx        ← Task 7
  src/pages/resident/DashboardResident.jsx    ← Task 10

Modifier :
  src/main.jsx                                ← Task 5
  src/App.jsx                                 ← Task 8
  src/components/Navbar.jsx                   ← Task 9
```

---

## Task 1 : Migration BDD v3.2

**Fichiers :**
- Créer : `migration-v3.2.sql` (à la racine du projet)

- [ ] **Étape 1 : Créer le fichier migration-v3.2.sql**

```sql
-- migration-v3.2.sql
-- Description : Ajout de toutes les nouvelles tables Réseaux-Résident + extensions
-- Date : 2026-03-28
-- Prérequis : supabase-schema.sql v2.0 déjà exécuté (tables admins, villes,
--             commerces, cartes, visites, etc. existent déjà)
--             La fonction is_admin() (SECURITY DEFINER) doit exister.
-- À exécuter dans : Supabase Dashboard > SQL Editor

BEGIN;

-- ── FONCTION updated_at (idempotente) ────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. PROFILES (résidents) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id        UUID REFERENCES villes(id) ON DELETE SET NULL,
  prenom          TEXT NOT NULL,
  nom             TEXT NOT NULL,
  email           TEXT NOT NULL,
  telephone       TEXT,
  adresse         TEXT,
  code_parrainage TEXT UNIQUE,
  parrain_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  avatar_url      TEXT,
  preferences     JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin"
  ON profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_profiles_ville_id ON profiles(ville_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_code_parrainage ON profiles(code_parrainage)
  WHERE code_parrainage IS NOT NULL;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. COMMERCANT_PROFILES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS commercant_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner'
              CHECK (role IN ('owner', 'manager', 'staff')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commercant_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commercant_profiles_select_own"
  ON commercant_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "commercant_profiles_insert_own"
  ON commercant_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "commercant_profiles_update_own"
  ON commercant_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "commercant_profiles_admin"
  ON commercant_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_commercant_profiles_commerce_id
  ON commercant_profiles(commerce_id);

-- ── 3. OFFRES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offres (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id        UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  titre              TEXT NOT NULL,
  description        TEXT,
  type               TEXT NOT NULL DEFAULT 'reduction'
                     CHECK (type IN ('reduction', 'cadeau', 'offre_speciale', 'programme_fidelite')),
  valeur             TEXT,
  conditions         TEXT,
  date_debut         TIMESTAMPTZ,
  date_fin           TIMESTAMPTZ,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  utilisations_count INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE offres ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les offres actives
CREATE POLICY "offres_select_anon"
  ON offres FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "offres_select_auth"
  ON offres FOR SELECT TO authenticated
  USING (true);

-- Un commerçant gère ses propres offres
CREATE POLICY "offres_commercant_manage"
  ON offres FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.commerce_id = offres.commerce_id
        AND commercant_profiles.id = auth.uid()
    )
  );

CREATE POLICY "offres_admin"
  ON offres FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_offres_commerce_id ON offres(commerce_id);
CREATE INDEX IF NOT EXISTS idx_offres_active ON offres(active) WHERE active = true;

-- Trigger : incrémente utilisations_count
CREATE OR REPLACE FUNCTION fn_sync_utilisations_offre()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE offres SET utilisations_count = utilisations_count + 1
  WHERE id = NEW.offre_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. UTILISATIONS_OFFRES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS utilisations_offres (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offre_id         UUID NOT NULL REFERENCES offres(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commerce_id      UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  date_utilisation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE utilisations_offres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "utilisations_offres_resident_select"
  ON utilisations_offres FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "utilisations_offres_resident_insert"
  ON utilisations_offres FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "utilisations_offres_admin"
  ON utilisations_offres FOR ALL TO authenticated
  USING (is_admin());

CREATE TRIGGER trg_sync_utilisations_offre
  AFTER INSERT ON utilisations_offres
  FOR EACH ROW EXECUTE FUNCTION fn_sync_utilisations_offre();

CREATE INDEX IF NOT EXISTS idx_utilisations_offres_profile_id ON utilisations_offres(profile_id);
CREATE INDEX IF NOT EXISTS idx_utilisations_offres_offre_id ON utilisations_offres(offre_id);

-- ── 5. EVENEMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evenements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id          UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  organisateur_type TEXT NOT NULL
                    CHECK (organisateur_type IN ('mairie', 'commerce', 'association', 'club')),
  organisateur_id   UUID,
  titre             TEXT NOT NULL,
  description       TEXT,
  lieu              TEXT,
  adresse           TEXT,
  date_debut        TIMESTAMPTZ NOT NULL,
  date_fin          TIMESTAMPTZ,
  image_url         TEXT,
  categorie         TEXT,
  gratuit           BOOLEAN NOT NULL DEFAULT TRUE,
  prix              DECIMAL(10, 2),
  lien_externe      TEXT,
  openagenda_id     TEXT,
  statut            TEXT NOT NULL DEFAULT 'brouillon'
                    CHECK (statut IN ('brouillon', 'publie', 'annule', 'termine')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evenements_select_publie_anon"
  ON evenements FOR SELECT TO anon
  USING (statut = 'publie');

CREATE POLICY "evenements_select_publie_auth"
  ON evenements FOR SELECT TO authenticated
  USING (statut = 'publie');

CREATE POLICY "evenements_admin"
  ON evenements FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_evenements_ville_id ON evenements(ville_id);
CREATE INDEX IF NOT EXISTS idx_evenements_date_debut ON evenements(date_debut);
CREATE INDEX IF NOT EXISTS idx_evenements_statut ON evenements(statut);

-- ── 6. ACTUALITES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actualites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id    UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  auteur_type TEXT NOT NULL
              CHECK (auteur_type IN ('mairie', 'commerce', 'association', 'club', 'admin')),
  auteur_id   UUID,
  titre       TEXT NOT NULL,
  contenu     TEXT NOT NULL,
  image_url   TEXT,
  categorie   TEXT,
  epingle     BOOLEAN NOT NULL DEFAULT FALSE,
  publie      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE actualites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "actualites_select_publie_anon"
  ON actualites FOR SELECT TO anon
  USING (publie = true);

CREATE POLICY "actualites_select_publie_auth"
  ON actualites FOR SELECT TO authenticated
  USING (publie = true);

CREATE POLICY "actualites_admin"
  ON actualites FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_actualites_ville_id ON actualites(ville_id);
CREATE INDEX IF NOT EXISTS idx_actualites_publie ON actualites(publie) WHERE publie = true;
CREATE INDEX IF NOT EXISTS idx_actualites_epingle ON actualites(epingle) WHERE epingle = true;

-- ── 7. ASSOCIATIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS associations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ville_id     UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  nom          TEXT NOT NULL,
  description  TEXT,
  categorie    TEXT NOT NULL,
  adresse      TEXT,
  email        TEXT,
  telephone    TEXT,
  site_web     TEXT,
  logo_url     TEXT,
  numero_rna   TEXT,
  numero_siret TEXT,
  actif        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "associations_select_actif_anon"
  ON associations FOR SELECT TO anon
  USING (actif = true);

CREATE POLICY "associations_select_actif_auth"
  ON associations FOR SELECT TO authenticated
  USING (actif = true);

CREATE POLICY "associations_admin"
  ON associations FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_associations_ville_id ON associations(ville_id);
CREATE INDEX IF NOT EXISTS idx_associations_actif ON associations(actif) WHERE actif = true;

-- ── 8. ASSOCIATION_PROFILES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS association_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  association_id UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'admin'
                 CHECK (role IN ('president', 'admin', 'membre')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE association_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "association_profiles_select_own"
  ON association_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "association_profiles_admin"
  ON association_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_association_profiles_asso_id
  ON association_profiles(association_id);

-- ── 9. PROJETS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projets (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  association_id       UUID NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  ville_id             UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  titre                TEXT NOT NULL,
  description          TEXT NOT NULL,
  objectif_montant     DECIMAL(10, 2),
  montant_collecte     DECIMAL(10, 2) NOT NULL DEFAULT 0,
  objectif_description TEXT,
  paliers              JSONB,
  image_url            TEXT,
  date_limite          TIMESTAMPTZ,
  statut               TEXT NOT NULL DEFAULT 'brouillon'
                       CHECK (statut IN ('brouillon', 'actif', 'atteint', 'cloture')),
  source               TEXT NOT NULL DEFAULT 'local'
                       CHECK (source IN ('local', 'simplyfot', 'simplyrugby')),
  source_id            TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projets_select_actif_anon"
  ON projets FOR SELECT TO anon
  USING (statut = 'actif');

CREATE POLICY "projets_select_auth"
  ON projets FOR SELECT TO authenticated
  USING (statut IN ('actif', 'atteint'));

CREATE POLICY "projets_asso_manage"
  ON projets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM association_profiles
      WHERE association_profiles.association_id = projets.association_id
        AND association_profiles.id = auth.uid()
    )
  );

CREATE POLICY "projets_admin"
  ON projets FOR ALL TO authenticated
  USING (is_admin());

CREATE TRIGGER trg_projets_updated_at
  BEFORE UPDATE ON projets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_projets_ville_id ON projets(ville_id);
CREATE INDEX IF NOT EXISTS idx_projets_association_id ON projets(association_id);
CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);

-- ── 10. SOUTIENS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS soutiens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id    UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  soutien_type TEXT NOT NULL CHECK (soutien_type IN ('resident', 'commerce', 'mairie')),
  soutien_id   UUID,
  montant      DECIMAL(10, 2),
  message      TEXT,
  anonyme      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE soutiens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soutiens_select_public_anon"
  ON soutiens FOR SELECT TO anon
  USING (true);

CREATE POLICY "soutiens_select_public_auth"
  ON soutiens FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "soutiens_insert_auth"
  ON soutiens FOR INSERT TO authenticated
  WITH CHECK (soutien_id = auth.uid());

CREATE POLICY "soutiens_admin"
  ON soutiens FOR ALL TO authenticated
  USING (is_admin());

CREATE OR REPLACE FUNCTION fn_sync_montant_collecte()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projets
  SET montant_collecte = (
    SELECT COALESCE(SUM(montant), 0)
    FROM soutiens
    WHERE projet_id = NEW.projet_id
  )
  WHERE id = NEW.projet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_montant_collecte
  AFTER INSERT OR UPDATE ON soutiens
  FOR EACH ROW EXECUTE FUNCTION fn_sync_montant_collecte();

CREATE INDEX IF NOT EXISTS idx_soutiens_projet_id ON soutiens(projet_id);

-- ── 11. MAIRIE_PROFILES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS mairie_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ville_id   UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'agent'
             CHECK (role IN ('elu', 'directeur', 'agent')),
  service    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mairie_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mairie_profiles_select_own"
  ON mairie_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "mairie_profiles_admin"
  ON mairie_profiles FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_mairie_profiles_ville_id ON mairie_profiles(ville_id);

-- ── 12. FAVORIS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favoris (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favori_type TEXT NOT NULL CHECK (favori_type IN ('commerce', 'association', 'evenement')),
  favori_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, favori_type, favori_id)
);

ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoris_own"
  ON favoris FOR ALL TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_favoris_profile_id ON favoris(profile_id);

-- ── 13. NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destinataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('offre', 'evenement', 'projet', 'actualite', 'systeme')),
  lien            TEXT,
  lu              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (destinataire_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (destinataire_id = auth.uid());

CREATE POLICY "notifications_admin_insert"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_notifications_destinataire_id ON notifications(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notifications_non_lu
  ON notifications(destinataire_id) WHERE lu = false;

-- ── 14. PARRAINAGES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parrainages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parrain_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filleul_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statut     TEXT NOT NULL DEFAULT 'en_attente'
             CHECK (statut IN ('en_attente', 'valide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE parrainages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parrainages_select_own"
  ON parrainages FOR SELECT TO authenticated
  USING (parrain_id = auth.uid() OR filleul_id = auth.uid());

CREATE POLICY "parrainages_admin"
  ON parrainages FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_parrainages_parrain_id ON parrainages(parrain_id);

-- ── 15. CAMPAGNES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campagnes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commerce_id UUID NOT NULL REFERENCES commerces(id) ON DELETE CASCADE,
  ville_id    UUID NOT NULL REFERENCES villes(id) ON DELETE CASCADE,
  titre       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL
              CHECK (type IN ('mise_en_avant', 'notification_push', 'banniere')),
  date_debut  TIMESTAMPTZ,
  date_fin    TIMESTAMPTZ,
  budget      DECIMAL(10, 2),
  statut      TEXT NOT NULL DEFAULT 'brouillon'
              CHECK (statut IN ('brouillon', 'active', 'terminee')),
  impressions INTEGER NOT NULL DEFAULT 0,
  clics       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campagnes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campagnes_commercant_own"
  ON campagnes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commercant_profiles
      WHERE commercant_profiles.commerce_id = campagnes.commerce_id
        AND commercant_profiles.id = auth.uid()
    )
  );

CREATE POLICY "campagnes_admin"
  ON campagnes FOR ALL TO authenticated
  USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_campagnes_commerce_id ON campagnes(commerce_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_ville_id ON campagnes(ville_id);

-- ── EXTENSIONS TABLE COMMERCES ────────────────────────────────
ALTER TABLE commerces
  ADD COLUMN IF NOT EXISTS description    TEXT,
  ADD COLUMN IF NOT EXISTS horaires       JSONB,
  ADD COLUMN IF NOT EXISTS photos         JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS site_web       TEXT,
  ADD COLUMN IF NOT EXISTS latitude       DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude      DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS siret          TEXT,
  ADD COLUMN IF NOT EXISTS premium        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_depuis TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commerces_owner_id
  ON commerces(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commerces_premium
  ON commerces(premium) WHERE premium = true;

-- ── EXTENSIONS TABLE VILLES ───────────────────────────────────
ALTER TABLE villes
  ADD COLUMN IF NOT EXISTS associations_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evenements_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS projets_actifs_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS population           INTEGER,
  ADD COLUMN IF NOT EXISTS code_postal          TEXT,
  ADD COLUMN IF NOT EXISTS code_insee           TEXT,
  ADD COLUMN IF NOT EXISTS latitude             DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude            DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS logo_url             TEXT,
  ADD COLUMN IF NOT EXISTS site_web             TEXT;

COMMIT;
```

- [ ] **Étape 2 : Exécuter dans Supabase Dashboard → SQL Editor**

  Ouvrir Supabase Dashboard → onglet "SQL Editor" → coller le contenu du fichier → cliquer "Run".

  Résultat attendu : `Success. No rows returned.`

  En cas d'erreur `function "is_admin" does not exist` : cette fonction doit avoir été créée par le script `supabase-schema.sql` existant. Vérifier qu'il a bien été exécuté en premier.

- [ ] **Étape 3 : Vérifier les tables créées**

  Dans Supabase Dashboard → Table Editor, vérifier que ces tables existent :
  `profiles`, `commercant_profiles`, `offres`, `utilisations_offres`, `evenements`,
  `actualites`, `associations`, `association_profiles`, `projets`, `soutiens`,
  `mairie_profiles`, `favoris`, `notifications`, `parrainages`, `campagnes`

  Vérifier que `commerces` a les nouvelles colonnes : `description`, `premium`, `owner_id`.
  Vérifier que `villes` a les nouvelles colonnes : `associations_count`, `code_postal`.

---

## Task 2 : AuthContext + AuthProvider

**Fichiers :**
- Créer : `src/contexts/AuthContext.jsx`

Rôle : fournir l'état d'authentification et les méthodes auth à toute l'app via React Context.
Les rôles sont détectés en interrogeant les tables de profil (profiles, commercant_profiles, etc.).

- [ ] **Étape 1 : Créer le dossier `src/contexts/` et le fichier `AuthContext.jsx`**

```jsx
// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

async function detecterRoles(userId, setProfile, setRoles) {
  // Interroger toutes les tables de profil en parallèle
  const resultats = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('commercant_profiles').select('id, commerce_id, role').eq('id', userId).maybeSingle(),
    supabase.from('association_profiles').select('id, association_id, role').eq('id', userId).maybeSingle(),
    supabase.from('mairie_profiles').select('id, ville_id, role').eq('id', userId).maybeSingle(),
    supabase.from('admins').select('id, role').eq('id', userId).maybeSingle(),
  ]);

  // Extraire les données (ignorer les erreurs, traiter comme null)
  const [profileRes, commercantRes, assoRes, maireRes, adminRes] = resultats.map(
    (r) => (r.status === 'fulfilled' ? r.value : { data: null })
  );

  const roles = [];
  if (profileRes.data) {
    setProfile(profileRes.data);
    roles.push('resident');
  }
  if (commercantRes.data) roles.push('commercant');
  if (assoRes.data) roles.push('association');
  if (maireRes.data) roles.push('mairie');
  if (adminRes.data) roles.push('admin');

  setRoles(roles);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérification de la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        detecterRoles(currentUser.id, setProfile, setRoles).finally(() =>
          setIsLoading(false)
        );
      } else {
        setIsLoading(false);
      }
    });

    // Écoute des changements d'état auth (connexion, déconnexion, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          detecterRoles(currentUser.id, setProfile, setRoles);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRoles([]);
  }

  function hasRole(role) {
    return roles.includes(role);
  }

  const value = { user, profile, roles, isLoading, signIn, signUp, signOut, hasRole };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext doit être utilisé à l\'intérieur d\'un <AuthProvider>');
  }
  return ctx;
}
```

- [ ] **Étape 2 : Vérifier la syntaxe** — ouvrir le fichier et s'assurer qu'il n'y a pas d'erreur de syntaxe évidente (accolades, imports).

---

## Task 3 : Hook useAuth

**Fichiers :**
- Créer : `src/hooks/useAuth.js`

Rôle : exposer le hook `useAuth` (consomme AuthContext). Séparation propre entre le contexte et le hook.

- [ ] **Étape 1 : Créer `src/hooks/useAuth.js`**

```javascript
// src/hooks/useAuth.js
// Expose l'état d'auth et les méthodes partout dans l'app.
// Utilisation : const { user, profile, roles, isLoading, signIn, signOut, hasRole } = useAuth();
export { useAuthContext as useAuth } from '../contexts/AuthContext';
```

---

## Task 4 : Composant ProtectedRoute

**Fichiers :**
- Créer : `src/components/ProtectedRoute.jsx`

Rôle : protéger les routes. Si non connecté → `/connexion`. Si mauvais rôle → dashboard approprié.

- [ ] **Étape 1 : Créer `src/components/ProtectedRoute.jsx`**

```jsx
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Mapping rôle → route de son dashboard
const ROUTE_PAR_ROLE = {
  admin: '/dashboard',
  commercant: '/mon-commerce',
  mairie: '/mairie',
  association: '/mon-association',
  resident: '/mon-espace',
};

function routePrincipale(roles) {
  // Priorité : admin > mairie > commercant > association > resident
  for (const role of ['admin', 'mairie', 'commercant', 'association', 'resident']) {
    if (roles.includes(role)) return ROUTE_PAR_ROLE[role];
  }
  return '/';
}

export default function ProtectedRoute({ children, role }) {
  const { user, roles, isLoading } = useAuth();

  // Attente du chargement de la session initiale
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Non connecté → page de connexion
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  // Rôle requis non présent → rediriger vers le bon dashboard
  if (role && !roles.includes(role)) {
    return <Navigate to={routePrincipale(roles)} replace />;
  }

  return children;
}
```

---

## Task 5 : Mise à jour de main.jsx (AuthProvider)

**Fichiers :**
- Modifier : `src/main.jsx`

Rôle : envelopper toute l'app dans `<AuthProvider>` pour que le contexte auth soit disponible partout.

- [ ] **Étape 1 : Lire `src/main.jsx`** (contenu actuel)

```jsx
// Contenu actuel de src/main.jsx :
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Étape 2 : Remplacer par la version avec AuthProvider**

```jsx
// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Étape 3 : Lancer `npm run dev` et vérifier**

  Attendu : Vite démarre sur le port 3000, console navigateur = 0 erreurs.
  Si erreur `is_admin` ou table manquante → la migration (Task 1) n'est pas encore exécutée. Supabase retournera juste des données nulles dans `detecterRoles`, ce qui est géré proprement.

---

## Task 6 : Page Connexion

**Fichiers :**
- Créer : `src/pages/auth/Connexion.jsx`

Rôle : formulaire email + mot de passe. Après connexion, redirige vers `/mon-espace` (ProtectedRoute gérera ensuite la redirection vers le bon dashboard selon le rôle).

- [ ] **Étape 1 : Créer le dossier `src/pages/auth/` et le fichier `Connexion.jsx`**

```jsx
// src/pages/auth/Connexion.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn(email.trim().toLowerCase(), password);
      // Redirection vers mon-espace. ProtectedRoute redirige ensuite selon le rôle.
      navigate('/mon-espace');
    } catch (err) {
      setError('Email ou mot de passe incorrect. Vérifiez vos informations.');
      console.error('Erreur connexion:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bleu/10 text-bleu mb-4">
            <LogIn size={28} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">Connexion</h1>
          <p className="text-gray-500">Accédez à votre espace Réseaux-Résident</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Pas encore de compte ?{' '}
          <Link
            to="/inscription-compte"
            className="text-bleu font-semibold hover:text-bleu-clair transition-colors"
          >
            Créer un compte résident
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
```

---

## Task 7 : Page InscriptionCompte

**Fichiers :**
- Créer : `src/pages/auth/InscriptionCompte.jsx`

Rôle : création d'un compte résident. Phase 1 = rôle résident uniquement. Crée un `auth.users` via Supabase Auth puis un `profiles` en BDD.

> **Note :** Si la confirmation d'email est activée dans Supabase (Authentication → Settings → "Enable email confirmations"), la session sera `null` après signUp. La page affichera un message pour vérifier l'email. Sinon, la session est immédiate.

- [ ] **Étape 1 : Créer `src/pages/auth/InscriptionCompte.jsx`**

```jsx
// src/pages/auth/InscriptionCompte.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-bleu focus:ring-2 focus:ring-bleu/20 outline-none transition-all text-base';

export default function InscriptionCompte() {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [villeId, setVilleId] = useState('');
  const [villes, setVilles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationEnvoyee, setConfirmationEnvoyee] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Charger les villes actives pour le sélecteur
  useEffect(() => {
    async function chargerVilles() {
      const { data } = await supabase
        .from('villes')
        .select('id, nom, departement')
        .eq('statut', 'actif')
        .order('nom');
      if (data) setVilles(data);
    }
    chargerVilles();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { user, session } = await signUp(
        email.trim().toLowerCase(),
        password,
        { prenom: prenom.trim(), nom: nom.trim() }
      );

      if (user) {
        // Créer le profil résident en BDD
        const { error: profileError } = await supabase.from('profiles').insert({
          id: user.id,
          ville_id: villeId || null,
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim().toLowerCase(),
        });

        if (profileError) {
          console.error('Erreur création profil:', profileError);
          // Ne pas bloquer l'inscription si le profil échoue
          // (l'utilisateur pourra compléter son profil plus tard)
        }
      }

      if (session) {
        // Session immédiate (confirmation email désactivée dans Supabase)
        navigate('/mon-espace');
      } else {
        // Email de confirmation envoyé
        setConfirmationEnvoyee(true);
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('Un compte existe déjà avec cet email. Connectez-vous.');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
      console.error('Erreur inscription:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Écran de confirmation email envoyée
  if (confirmationEnvoyee) {
    return (
      <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4 text-center"
        >
          <CheckCircle2 size={48} className="text-vert mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-texte mb-3">
            Vérifiez votre email
          </h2>
          <p className="text-gray-500 mb-6">
            Un email de confirmation a été envoyé à <strong>{email}</strong>.
            Cliquez sur le lien dans l'email pour activer votre compte.
          </p>
          <Link
            to="/connexion"
            className="inline-block px-6 py-3 bg-bleu text-white font-bold rounded-xl hover:bg-bleu-clair transition-colors"
          >
            Retour à la connexion
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-24 bg-creme flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 max-w-md w-full mx-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bleu/10 text-bleu mb-4">
            <UserPlus size={28} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">
            Créer mon compte
          </h1>
          <p className="text-gray-500">Rejoignez Réseaux-Résident gratuitement</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Prénom
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Marie"
                required
                autoComplete="given-name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nom
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                required
                autoComplete="family-name"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Mot de passe <span className="text-gray-400 font-normal">(8 caractères min.)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {villes.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Votre ville <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <select
                value={villeId}
                onChange={(e) => setVilleId(e.target.value)}
                className={inputClass}
              >
                <option value="">Sélectionner une ville…</option>
                {villes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom} ({v.departement})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-bleu hover:bg-bleu-clair text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Création du compte...' : 'Créer mon compte gratuitement'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Déjà un compte ?{' '}
          <Link
            to="/connexion"
            className="text-bleu font-semibold hover:text-bleu-clair transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
```

---

## Task 8 : Mise à jour de App.jsx

**Fichiers :**
- Modifier : `src/App.jsx`

Rôle : ajouter les routes auth et les routes protégées des dashboards.

- [ ] **Étape 1 : Lire `src/App.jsx`** — le contenu actuel se termine à la ligne 63.

- [ ] **Étape 2 : Remplacer le contenu intégral de `src/App.jsx`**

```jsx
// src/App.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages publiques existantes
const Home = lazy(() => import('./pages/Home'));
const Ville = lazy(() => import('./pages/villes/Ville'));
const Inscription = lazy(() => import('./pages/inscription/Inscription'));
const Commercants = lazy(() => import('./pages/commercants/Commercants'));
const Rejoindre = lazy(() => import('./pages/commercants/Rejoindre'));
const Scan = lazy(() => import('./pages/scan/Scan'));
const Resilier = lazy(() => import('./pages/Resilier'));
const RetirerCommerce = lazy(() => import('./pages/RetirerCommerce'));
const CGV = lazy(() => import('./pages/CGV'));
const Confidentialite = lazy(() => import('./pages/Confidentialite'));

// Pages auth (nouvelles)
const Connexion = lazy(() => import('./pages/auth/Connexion'));
const InscriptionCompte = lazy(() => import('./pages/auth/InscriptionCompte'));

// Dashboards (nouveaux)
const DashboardResident = lazy(() => import('./pages/resident/DashboardResident'));

// Dashboard admin existant
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-creme">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-bleu border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Chargement...</p>
      </div>
    </div>
  );
}

function W({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Pages publiques */}
        <Route index element={<W><Home /></W>} />
        <Route path="villes/:slug" element={<W><Ville /></W>} />
        <Route path="inscription" element={<W><Inscription /></W>} />
        <Route path="commercants" element={<W><Commercants /></W>} />
        <Route path="commercants/rejoindre" element={<W><Rejoindre /></W>} />
        <Route path="scan" element={<W><Scan /></W>} />
        <Route path="resilier" element={<W><Resilier /></W>} />
        <Route path="retirer-commerce" element={<W><RetirerCommerce /></W>} />
        <Route path="cgv" element={<W><CGV /></W>} />
        <Route path="confidentialite" element={<W><Confidentialite /></W>} />

        {/* Auth */}
        <Route path="connexion" element={<W><Connexion /></W>} />
        <Route path="inscription-compte" element={<W><InscriptionCompte /></W>} />

        {/* Dashboard Résident (protégé) */}
        <Route
          path="mon-espace"
          element={
            <ProtectedRoute role="resident">
              <W><DashboardResident /></W>
            </ProtectedRoute>
          }
        />

        {/* Dashboard Admin existant (protégé) */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute role="admin">
              <W><Dashboard /></W>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center text-center px-4">
              <div>
                <h1 className="font-serif text-6xl font-bold text-bleu mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-8">Cette page n'existe pas.</p>
                <a
                  href="/"
                  className="px-6 py-3 bg-or text-white font-bold rounded-xl hover:bg-or-clair transition-colors"
                >
                  Retour à l'accueil
                </a>
              </div>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
```

- [ ] **Étape 3 : Vérifier dans le navigateur**

  Aller sur `http://localhost:3000/connexion` → la page Connexion doit s'afficher.
  Aller sur `http://localhost:3000/inscription-compte` → la page InscriptionCompte doit s'afficher.
  Aller sur `http://localhost:3000/mon-espace` sans être connecté → doit rediriger vers `/connexion`.

---

## Task 9 : Refactoring de la Navbar

**Fichiers :**
- Modifier : `src/components/Navbar.jsx`

Rôle :
1. Renommer "Carte Résident" → "Réseaux-Résident"
2. Afficher des liens différents selon l'état d'auth et le rôle
3. Ajouter un bouton "Déconnexion" quand l'utilisateur est connecté

- [ ] **Étape 1 : Lire `src/components/Navbar.jsx`** — le contenu actuel se termine à la ligne 151.

- [ ] **Étape 2 : Remplacer le contenu intégral de `src/components/Navbar.jsx`**

```jsx
// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

// Liens publics (visiteurs non connectés)
const LIENS_PUBLICS = [
  { name: 'Comment ça marche', anchor: 'comment-ca-marche', path: '/' },
  { name: 'Tarifs', anchor: 'tarifs', path: '/' },
  { name: 'Commerçants', path: '/commercants' },
  { name: 'Offrir une carte', anchor: 'cartes-cadeaux', path: '/' },
];

// Liens selon le rôle principal connecté
const LIENS_RESIDENT = [
  { name: 'Mon espace', path: '/mon-espace' },
];
const LIENS_COMMERCANT = [
  { name: 'Mon commerce', path: '/mon-commerce' },
];
const LIENS_ADMIN = [
  { name: 'Dashboard', path: '/dashboard' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, roles, isLoading, signOut, profile } = useAuth();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  function handleAnchorClick(e, link) {
    if (!link.anchor) return;
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileOpen(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  // Déterminer les liens à afficher selon le rôle
  function getLiensDashboard() {
    if (roles.includes('admin')) return LIENS_ADMIN;
    if (roles.includes('commercant')) return LIENS_COMMERCANT;
    if (roles.includes('resident')) return LIENS_RESIDENT;
    return [];
  }

  const isConnecte = !isLoading && !!user;
  const liensDashboard = getLiensDashboard();
  // Quand connecté : liens publics sans ancres + liens du dashboard
  // Quand non connecté : tous les liens publics
  const liensAffiches = isConnecte ? liensDashboard : LIENS_PUBLICS;

  function renderLien(link, extraClass = '') {
    if (link.anchor) {
      return (
        <a
          key={link.name}
          href={`/#${link.anchor}`}
          onClick={(e) => handleAnchorClick(e, link)}
          className={`text-sm font-medium transition-colors hover:text-or ${
            isScrolled ? 'text-texte' : 'text-white'
          } ${extraClass}`}
        >
          {link.name}
        </a>
      );
    }
    return (
      <Link
        key={link.name}
        to={link.path}
        className={`text-sm font-medium transition-colors hover:text-or ${
          isScrolled ? 'text-texte' : 'text-white'
        } ${extraClass}`}
      >
        {link.name}
      </Link>
    );
  }

  function renderLienMobile(link) {
    if (link.anchor) {
      return (
        <a
          key={link.name}
          href={`/#${link.anchor}`}
          onClick={(e) => handleAnchorClick(e, link)}
          className="px-4 py-3 text-lg font-medium text-texte rounded-xl hover:bg-gray-50 transition-colors"
        >
          {link.name}
        </a>
      );
    }
    return (
      <Link
        key={link.name}
        to={link.path}
        className="px-4 py-3 text-lg font-medium text-texte rounded-xl hover:bg-gray-50 transition-colors"
      >
        {link.name}
      </Link>
    );
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link
            to="/"
            className="font-serif text-xl font-bold px-3 py-1.5 rounded bg-bleu text-white hover:opacity-90 transition-opacity"
          >
            Réseaux-Résident
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Navigation principale">
            {liensAffiches.map((link) => renderLien(link))}

            {isConnecte ? (
              <div className="flex items-center gap-3">
                {/* Nom du profil */}
                {profile && (
                  <span className={`text-sm font-medium flex items-center gap-1.5 ${isScrolled ? 'text-texte' : 'text-white'}`}>
                    <User size={16} />
                    {profile.prenom}
                  </span>
                )}
                {/* Déconnexion */}
                <button
                  onClick={handleSignOut}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-red-500 ${
                    isScrolled ? 'text-gray-500' : 'text-white/70'
                  }`}
                  aria-label="Se déconnecter"
                >
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link
                to="/connexion"
                className="bg-or hover:bg-or-clair text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
              >
                Connexion
              </Link>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-bleu rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden shadow-lg"
          >
            <nav className="px-4 py-6 flex flex-col gap-1" aria-label="Menu mobile">
              {liensAffiches.map(renderLienMobile)}

              {isConnecte ? (
                <>
                  {profile && (
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                      <User size={16} />
                      Connecté en tant que <strong>{profile.prenom} {profile.nom}</strong>
                    </div>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="mt-2 px-4 py-3 text-lg font-bold text-red-500 rounded-xl hover:bg-red-50 transition-colors text-left flex items-center gap-2"
                  >
                    <LogOut size={20} />
                    Se déconnecter
                  </button>
                </>
              ) : (
                <Link
                  to="/connexion"
                  className="mt-4 px-4 py-4 bg-or text-white font-bold rounded-xl text-center text-lg transition-colors hover:bg-or-clair"
                >
                  Connexion
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
```

- [ ] **Étape 3 : Vérifier dans le navigateur**

  - Non connecté : Navbar affiche "Réseaux-Résident", liens publics, bouton "Connexion"
  - Aller sur `/connexion`, se connecter avec un compte test → Navbar doit afficher le prénom et "Déconnexion"
  - Cliquer "Déconnexion" → revenir sur `/` et Navbar revient en mode visiteur

---

## Task 10 : Dashboard Résident minimal

**Fichiers :**
- Créer : `src/pages/resident/DashboardResident.jsx`

Rôle : page principale du résident authentifié. Affiche :
1. La carte digitale (QR code) si une carte `cartes` est associée à son email
2. Les commerces de sa ville
3. Les offres disponibles (liste vide si aucune pour l'instant)

> La carte est cherchée via `cartes.email = user.email`. Si aucune carte trouvée (compte créé via le nouveau flow), on affiche un message invitant à s'inscrire via `/inscription`.

- [ ] **Étape 1 : Créer le dossier `src/pages/resident/` et le fichier `DashboardResident.jsx`**

```jsx
// src/pages/resident/DashboardResident.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Store, Tag, MapPin, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { CarteDigitale } from '../../components/index';

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
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-or/30 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-texte text-sm">{offre.titre}</h4>
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 shrink-0">
          {offre.type === 'reduction' && 'Réduction'}
          {offre.type === 'cadeau' && 'Cadeau'}
          {offre.type === 'offre_speciale' && 'Offre spéciale'}
          {offre.type === 'programme_fidelite' && 'Fidélité'}
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
function CommerceCard({ commerce }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bleu/20 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-bleu/10 flex items-center justify-center text-bleu shrink-0">
          <Store size={18} />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-texte text-sm truncate">{commerce.nom}</h4>
          <span className="text-xs text-gray-400">{commerce.categorie}</span>
        </div>
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
  const [carte, setCarte] = useState(null);
  const [commerces, setCommerces] = useState([]);
  const [offres, setOffres] = useState([]);
  const [ville, setVille] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !profile) return;
    async function chargerDonnees() {
      try {
        setIsLoading(true);

        // 1. Charger les données en parallèle
        const [carteRes, villeRes] = await Promise.all([
          // Chercher la carte par email (lien entre ancien et nouveau système)
          supabase
            .from('cartes')
            .select('id, numero, qr_token, formule, type_carte, statut, date_expiration, prenom, nom_titulaire')
            .eq('email', user.email)
            .eq('statut', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          // Charger les infos de la ville du profil
          profile.ville_id
            ? supabase.from('villes').select('id, nom, slug').eq('id', profile.ville_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (carteRes.error) throw carteRes.error;
        setCarte(carteRes.data);

        if (villeRes.data) {
          setVille(villeRes.data);
        }

        // 2. Si on a une ville, charger commerces et offres
        if (profile.ville_id) {
          const [commercesRes, commercesIdsRes] = await Promise.all([
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
          const listeCommerces = commercesRes.data ?? [];
          setCommerces(listeCommerces);

          // 3. Charger les offres des commerces de la ville
          if (listeCommerces.length > 0) {
            const idsCommerces = (commercesIdsRes.data ?? []).map((c) => c.id);
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

  // ── Calcul de l'expiration (pour CarteDigitale) ──
  let expStr = '';
  if (carte?.date_expiration) {
    const exp = new Date(carte.date_expiration);
    expStr = `${String(exp.getMonth() + 1).padStart(2, '0')}/${exp.getFullYear()}`;
  }
  const isDigital =
    carte?.type_carte === 'digitale' || carte?.type_carte === 'les_deux';

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
            <CarteDigitale
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
              <span className="text-sm text-gray-400">{offres.length} offre{offres.length !== 1 ? 's' : ''}</span>
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
                  <CommerceCard key={commerce.id} commerce={commerce} />
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Tester le dashboard**

  Se connecter avec un compte qui a un profil dans `profiles` (ou créer via `/inscription-compte`).
  Naviguer vers `/mon-espace`.

  Vérifier :
  - Affichage du prénom et de la ville
  - Si une `cartes` row existe avec cet email → `CarteDigitale` s'affiche avec le QR code
  - Si aucune carte → "Pas encore de carte résident" s'affiche
  - La section offres affiche "Aucune offre" (normal, tables vides en Phase 1)
  - La section commerces affiche les commerces si la ville a des commerces en BDD
  - Responsive : vérifier à 375px (colonnes empilées), 768px, 1280px

- [ ] **Étape 3 : Tester le flow complet**

  1. Aller sur `http://localhost:3000/connexion` sans compte → voir le formulaire
  2. Aller sur `/inscription-compte` → créer un compte avec email + mot de passe + ville
  3. Si confirmation désactivée dans Supabase → redirection automatique vers `/mon-espace`
  4. Si confirmation activée → message "vérifiez votre email" s'affiche
  5. Vérifier dans Supabase Dashboard → Table Editor → `profiles` → la ligne a été créée
  6. Cliquer "Déconnexion" dans la Navbar → retour sur `/`
  7. Aller sur `/mon-espace` → redirection vers `/connexion`

---

## Résumé des fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `migration-v3.2.sql` | Créé — exécuté dans Supabase Dashboard |
| `src/contexts/AuthContext.jsx` | Créé |
| `src/hooks/useAuth.js` | Créé |
| `src/components/ProtectedRoute.jsx` | Créé |
| `src/main.jsx` | Modifié — ajout AuthProvider |
| `src/pages/auth/Connexion.jsx` | Créé |
| `src/pages/auth/InscriptionCompte.jsx` | Créé |
| `src/App.jsx` | Modifié — nouvelles routes |
| `src/components/Navbar.jsx` | Modifié — navigation contextuelle |
| `src/pages/resident/DashboardResident.jsx` | Créé |

## Ce qui n'est PAS dans ce plan (Phase 2+)

- Dashboard Commerçant (`/mon-commerce`) → Phase 2, Task 6
- Dashboard Association (`/mon-association`) → Phase 2, Task 7
- Dashboard Mairie (`/mairie`) → Phase 3, Task 11
- Gestion des offres (CRUD) → Phase 2, Task 8
- Système d'événements → Phase 2, Task 9
- Intégration API Sirene / RNA / OpenAgenda → Phase 3
- Module parrainage → Phase 4
