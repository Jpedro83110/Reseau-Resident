# POST-AUDIT — Prompts Claude Code
## Mise en production et finalisation après audit

> **Contexte** : L'audit complet (Audits 1-7) est terminé. Le code est propre, sécurisé, responsive et accessible.
> Ces prompts traitent les tâches identifiées dans le récap "À FAIRE APRÈS L'AUDIT".
> Lance-les dans l'ordre. Chaque prompt est autonome.
>
> **Pré-requis** : CLAUDE.md à la racine, audit terminé, `npm run dev` fonctionne sans erreur.

---

## ═══════════════════════════════════════════════════
## PA-1 — MIGRATION V4 : VÉRIFICATION AVANT EXÉCUTION
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md section 4 "BASE DE DONNÉES" en entier.

L'audit a généré le fichier migration-v4.sql. Avant que je l'exécute dans Supabase Dashboard, tu dois le vérifier ligne par ligne pour garantir zéro erreur en production.

Ouvre migration-v4.sql et vérifie :

1. STRUCTURE
   - Le fichier commence par BEGIN; et finit par COMMIT;
   - Chaque CREATE TABLE utilise IF NOT EXISTS
   - Chaque ALTER TABLE utilise ADD COLUMN IF NOT EXISTS
   - Aucun DROP TABLE ni DROP COLUMN (on ne détruit rien en prod)

2. TABLES — vérifie que ces 15 tables sont toutes présentes :
   - profiles
   - commercant_profiles
   - offres
   - utilisations_offres
   - evenements
   - actualites
   - associations
   - association_profiles
   - projets
   - soutiens
   - mairie_profiles
   - favoris
   - notifications
   - parrainages
   - campagnes

3. FK ET CONTRAINTES — pour chaque table vérifie :
   - Les FK pointent vers des tables qui existent (y compris les tables existantes du schéma v2)
   - Les CHECK constraints couvrent toutes les valeurs mentionnées dans CLAUDE.md
   - Les DEFAULT sont cohérents
   - Les colonnes NOT NULL ont du sens (pas de NOT NULL sur des champs optionnels)

4. EXTENSIONS TABLE COMMERCES — vérifie que l'ALTER TABLE ajoute :
   description, horaires (JSONB), photos (JSONB), site_web, latitude, longitude, siret, premium, premium_depuis, owner_id

5. EXTENSIONS TABLE VILLES — vérifie que l'ALTER TABLE ajoute :
   associations_count, evenements_count, projets_actifs_count, population, code_postal, code_insee, latitude, longitude, logo_url, site_web

6. RLS — vérifie pour CHAQUE nouvelle table :
   - ALTER TABLE ... ENABLE ROW LEVEL SECURITY; est présent
   - Au moins une policy SELECT existe
   - Au moins une policy service_role ALL existe
   - Les policies INSERT utilisent WITH CHECK (pas USING seul)
   - Les policies respectent la logique de CLAUDE.md section 4

7. INDEXES — vérifie qu'il y a des indexes sur :
   - Toutes les FK (ville_id, commerce_id, association_id, profile_id, etc.)
   - Les colonnes de filtre fréquent (statut, actif, publie, type)
   - Les colonnes de tri (created_at, date_debut)

8. TRIGGERS — vérifie la présence de :
   - updated_at auto sur profiles, projets, commerces
   - Sync compteurs dans villes (associations_count, evenements_count, projets_actifs_count)
   - Sync montant_collecte dans projets quand un soutien est inséré

9. FONCTIONS RPC — vérifie :
   - get_dashboard_stats(p_ville_id) retourne les KPIs mairie
   - get_projets_ville(p_ville_id) retourne les projets actifs avec progression
   - Toutes les fonctions sont SECURITY DEFINER STABLE
   - Les types de retour sont corrects

10. COMPATIBILITÉ — vérifie que la migration ne casse rien :
    - Aucun conflit avec les tables existantes (admins, villes, commerces, cartes, visites, etc.)
    - Aucun conflit avec les triggers existants
    - Aucun conflit avec les fonctions existantes (is_admin, get_stats_mensuelles, get_carte_by_qr)
    - Les nouvelles policies ne contredisent pas les policies existantes

Si tu trouves des erreurs, corrige le fichier migration-v4.sql directement.
Si tout est bon, confirme avec "Migration v4 validée — prête pour exécution Supabase".

Produis aussi un résumé en 10 lignes de ce que cette migration fait, que je puisse relire avant de cliquer "Run" dans Supabase.
```

---

## ═══════════════════════════════════════════════════
## PA-2 — AUTH MULTI-RÔLE : TEST ET DURCISSEMENT
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md section 8 "AUTHENTIFICATION".

L'audit a créé le système d'auth multi-rôle (useAuth, AuthContext, ProtectedRoute). Maintenant il faut le tester et le durcir pour les conditions réelles.

ÉTAPE 1 : VÉRIFIE L'INTÉGRALITÉ DU FLUX AUTH

Ouvre et lis ces fichiers dans l'ordre :
- src/hooks/useAuth.js
- src/contexts/AuthContext.jsx
- src/components/ProtectedRoute.jsx
- src/pages/auth/Connexion.jsx
- src/pages/auth/InscriptionCompte.jsx

Pour chaque fichier, vérifie :

a) useAuth.js
   - onAuthStateChange écoute correctement les événements SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
   - La détection des rôles query les 5 tables (profiles, commercant_profiles, association_profiles, mairie_profiles, admins) en parallèle avec Promise.all, PAS en séquentiel
   - Si une table n'existe pas encore en BDD (migration pas encore exécutée), le query doit échouer silencieusement (try/catch par table, pas un crash global)
   - Le signUp crée bien une ligne dans profiles avec les metadata (prenom, nom, ville_id)
   - Le signOut nettoie tout le state (user, profile, roles)
   - Ajoute un guard : si la session expire côté Supabase, le user est automatiquement déconnecté côté React

b) AuthContext.jsx
   - Le Provider expose toutes les valeurs de useAuth
   - L'écran de chargement initial bloque le rendu tant que isLoading (pas de flash de contenu)
   - Le loading spinner est le composant LoadingSpinner partagé avec message "Connexion en cours..."

c) ProtectedRoute.jsx
   - Si pas auth → redirect /connexion avec state.from pour revenir après login
   - Si auth mais mauvais rôle → redirect /mon-espace (pas une boucle infinie si /mon-espace est aussi protégé)
   - Vérifie qu'il n'y a PAS de boucle de redirection possible :
     /mon-espace requiert role="resident"
     Si un user auth n'a aucun rôle → il doit aller sur une page "Complétez votre profil", PAS boucler
   - Crée une page src/pages/auth/CompleterProfil.jsx si elle n'existe pas :
     "Bienvenue ! Pour accéder à votre espace, complétez votre profil."
     Formulaire : prénom, nom, ville (si pas déjà renseigné)
     Après submit → crée la ligne profiles → redirect /mon-espace

d) Connexion.jsx
   - Après login réussi → redirect vers state.from OU vers la bonne page selon le rôle principal :
     admin → /dashboard
     mairie → /mairie
     commercant → /mon-commerce
     association → /mon-association
     resident → /mon-espace
   - Si l'utilisateur a plusieurs rôles → redirect vers le rôle de plus haute priorité (mairie > admin > commercant > association > resident)
   - Erreurs en français :
     "Invalid login credentials" → "Email ou mot de passe incorrect"
     "Email not confirmed" → "Veuillez confirmer votre email avant de vous connecter"
     "Too many requests" → "Trop de tentatives. Réessayez dans quelques minutes."
   - Bouton avec loading state (spinner + "Connexion..." + disabled)

e) InscriptionCompte.jsx
   - Validation avant soumission :
     Prénom et nom : minimum 2 caractères
     Email : regex basique + type="email"
     Mot de passe : minimum 8 caractères, affiché avec toggle œil
     Confirmation : doit matcher le mot de passe
     Ville : obligatoire (dropdown depuis Supabase)
   - Après inscription → message "Un email de confirmation vous a été envoyé" si Supabase Auth le requiert
   - OU → connexion automatique et redirect vers /mon-espace si la confirmation n'est pas activée
   - Le champ code parrainage (optionnel) est fonctionnel même si la table parrainages n'est pas encore créée (fail silencieux)

ÉTAPE 2 : SCÉNARIOS DE BORD À GÉRER

Vérifie et implémente la gestion de ces cas :

1. L'utilisateur ferme le navigateur et revient → la session Supabase doit persister (token stocké)
2. Le token expire → onAuthStateChange doit capter TOKEN_REFRESHED ou SIGNED_OUT
3. L'utilisateur est supprimé côté Supabase Auth → le frontend doit gérer le 401 et déconnecter
4. L'utilisateur s'inscrit mais la création du profil échoue → afficher l'erreur, proposer de réessayer, ne PAS laisser un user auth sans profil
5. Deux onglets ouverts → la déconnexion dans un onglet doit se propager (onAuthStateChange le gère natif)

ÉTAPE 3 : AJOUTE LES ROUTES DANS APP.JSX

Vérifie que App.jsx contient bien :
- /connexion → Connexion (public)
- /inscription-compte → InscriptionCompte (public)
- /completer-profil → CompleterProfil (auth requis mais PAS de rôle requis)
- /mot-de-passe-oublie → MotDePasseOublie (public) — crée une page basique si elle n'existe pas :
  Formulaire email + bouton "Envoyer le lien de réinitialisation"
  Utilise supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL + '/nouveau-mot-de-passe' })
  Message succès : "Si un compte existe avec cet email, vous recevrez un lien."

Montre-moi tous les fichiers modifiés avec les changements.
```

---

## ═══════════════════════════════════════════════════
## PA-3 — VARIABLES D'ENVIRONNEMENT ET CONFIGURATION
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md section 12 "VARIABLES D'ENVIRONNEMENT".

L'audit a identifié des variables d'environnement à configurer. Tu vas maintenant vérifier et sécuriser tout le système de configuration.

ÉTAPE 1 : VÉRIFIE L'UTILISATION DES VARIABLES DANS LE CODE

Scanne TOUS les fichiers du projet et liste chaque endroit où une variable d'environnement est utilisée.
Pour chaque occurrence, vérifie :

a) CÔTÉ FRONTEND (src/) — seules les variables VITE_ sont accessibles :
   - import.meta.env.VITE_SUPABASE_URL → utilisé dans src/lib/supabase.js
   - import.meta.env.VITE_SUPABASE_ANON_KEY → utilisé dans src/lib/supabase.js
   - import.meta.env.VITE_STRIPE_PUBLIC_KEY → utilisé dans src/lib/stripe.js
   - import.meta.env.VITE_APP_URL → utilisé si besoin dans les liens de partage

   Vérifie qu'aucune variable secrète n'est utilisée côté frontend :
   - PAS de SUPABASE_SERVICE_ROLE_KEY
   - PAS de STRIPE_SECRET_KEY
   - PAS de STRIPE_WEBHOOK_SECRET
   - PAS de RESEND_API_KEY
   - PAS de RR_SYNC_API_KEY

   Note : L'audit a corrigé VITE_INSEE_API_KEY → l'appel INSEE doit passer par une serverless function (l'API key ne doit PAS être côté frontend). Vérifie que c'est bien le cas.

b) CÔTÉ SERVERLESS (api/) — variables process.env :
   - process.env.SUPABASE_URL
   - process.env.SUPABASE_SERVICE_ROLE_KEY
   - process.env.STRIPE_SECRET_KEY
   - process.env.STRIPE_WEBHOOK_SECRET
   - process.env.RESEND_API_KEY
   - process.env.RR_SYNC_API_KEY (pour les endpoints sync)
   - process.env.APP_URL (pour les URLs de redirect)

ÉTAPE 2 : CRÉE UN PROXY SERVERLESS POUR L'API INSEE

L'API Sirene INSEE nécessite une clé API qui ne doit PAS être exposée côté frontend.
Crée le fichier api/sirene-proxy.js :

- Méthode : GET
- Query params : ?siret=XXXXXXXXXXXXX ou ?q=nom_entreprise&codePostal=XXXXX
- Logique :
  1. Valide les paramètres (siret = 14 chiffres, q = non vide)
  2. Appelle l'API INSEE avec le Bearer token process.env.INSEE_API_KEY
  3. Parse et filtre le résultat (ne retourne que nom, adresse, activité, date création)
  4. Retourne le JSON filtré au frontend
- Gestion d'erreur : 404 si SIRET non trouvé, 429 si rate limit, 500 si erreur serveur
- Headers CORS appropriés

Ensuite, vérifie que src/lib/sirene.js appelle /api/sirene-proxy et PAS directement l'API INSEE.

ÉTAPE 3 : CRÉE LE FICHIER .env.example

Crée un fichier .env.example à la racine (committé dans git, sans valeurs réelles) :

# Frontend (Vite — préfixe VITE_ obligatoire)
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...votre-anon-key
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_APP_URL=http://localhost:3000

# Serverless (Vercel — process.env)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...votre-service-role-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@reseaux-resident.fr
INSEE_API_KEY=votre-cle-insee
RR_SYNC_API_KEY=votre-cle-sync-interne
APP_URL=https://reseaux-resident.fr

ÉTAPE 4 : VÉRIFIE .gitignore

Confirme que .gitignore contient :
.env
.env.local
.env.*.local
.env.production
node_modules/
dist/
.vercel/

ÉTAPE 5 : AJOUTE UN GUARD DE DÉMARRAGE

Dans src/lib/supabase.js, ajoute une vérification au top :

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Variables Supabase manquantes. Créez un fichier .env.local à partir de .env.example');
}

Même chose dans src/lib/stripe.js pour VITE_STRIPE_PUBLIC_KEY.

Montre-moi tous les fichiers créés/modifiés.
```

---

## ═══════════════════════════════════════════════════
## PA-4 — STRIPE : CARTES PHYSIQUES + PREMIUM
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md sections 10 "MODÈLE ÉCONOMIQUE" et 12 "VARIABLES D'ENVIRONNEMENT".

L'intégration Stripe doit gérer deux flux distincts : les cartes physiques (paiement unique) et le premium commerçant (abonnement). Vérifie le premier, prépare le second.

═══ FLUX 1 : CARTES PHYSIQUES (existant — vérifier) ═══

Ouvre api/create-payment-intent.js et vérifie :

1. Le montant est validé côté serveur :
   const PRIX_CARTES = {
     individuel: 299,  // 2,99€ en centimes
     couple: 499,
     famille: 499,
   };
   Le montant doit correspondre à la formule, PAS être envoyé par le frontend.

2. Les metadata Stripe contiennent : carte_id, ville_id, email, formule
3. La currency est 'eur'
4. L'idempotency key est utilisée si possible (évite les doubles paiements)

Ouvre api/stripe-webhook.js et vérifie :

1. La signature est vérifiée :
   const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
   CRITIQUE : le rawBody doit être le body brut (Buffer), PAS le JSON parsé

2. L'event payment_intent.succeeded :
   - Récupère les metadata (carte_id)
   - UPDATE cartes SET statut = 'active' WHERE id = metadata.carte_id AND statut = 'en_attente_paiement'
   - Utilise le Supabase service_role client

3. L'event payment_intent.payment_failed :
   - Log l'erreur
   - Optionnel : UPDATE cartes SET statut = 'annulee'

4. Idempotence : si l'event a déjà été traité (carte déjà active), ne pas re-traiter

Si des corrections sont nécessaires, applique-les.

═══ FLUX 2 : PREMIUM COMMERÇANT (nouveau — créer) ═══

Crée api/create-subscription.js :

export default async function handler(req, res) {
  // 1. Méthode POST uniquement
  // 2. Valide le body : { commerce_id, plan } où plan = 'essentiel' | 'premium'
  // 3. Récupère le commerce depuis Supabase pour vérifier qu'il existe
  // 4. Crée ou récupère le Stripe Customer (par email du commerce owner)
  // 5. Crée une Stripe Checkout Session en mode 'subscription' :
  //    - price : process.env.STRIPE_PRICE_ESSENTIEL ou STRIPE_PRICE_PREMIUM selon le plan
  //    - metadata : { commerce_id, plan }
  //    - success_url : APP_URL + '/mon-commerce?premium=success'
  //    - cancel_url : APP_URL + '/mon-commerce?premium=cancel'
  //    - allow_promotion_codes: true
  // 6. Retourne { url: session.url }
}

Modifie api/stripe-webhook.js pour ajouter les events subscription :

// Après les events payment_intent existants, ajoute :

case 'checkout.session.completed': {
  const session = event.data.object;
  if (session.mode === 'subscription' && session.metadata?.commerce_id) {
    // UPDATE commerces SET premium = true, premium_depuis = NOW() WHERE id = metadata.commerce_id
    // UPDATE commerces SET stripe_customer_id = session.customer WHERE id = metadata.commerce_id
  }
  break;
}

case 'customer.subscription.deleted': {
  const subscription = event.data.object;
  // Trouver le commerce par stripe_customer_id
  // UPDATE commerces SET premium = false WHERE stripe_customer_id = subscription.customer
  break;
}

case 'customer.subscription.updated': {
  const subscription = event.data.object;
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    // Optionnel : envoyer une notification, mais ne pas désactiver immédiatement
  }
  break;
}

IMPORTANT : Ne casse PAS le flux cartes physiques existant. Les deux flux coexistent dans le même webhook.

Ajoute les variables d'environnement dans .env.example :
STRIPE_PRICE_ESSENTIEL=price_xxx
STRIPE_PRICE_PREMIUM=price_xxx

Vérifie que la colonne stripe_customer_id existe dans la migration-v4.sql pour la table commerces. Si non, ajoute-la :
ALTER TABLE commerces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

Montre-moi tous les fichiers créés/modifiés.
```

---

## ═══════════════════════════════════════════════════
## PA-5 — SCAN QR CODE : TEST MOBILE RÉEL
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md et ouvre src/pages/scan/Scan.jsx.

Le scan QR code est une fonctionnalité critique — c'est le cœur de l'interaction commerçant-résident. Il doit être parfait sur un vrai téléphone.

VÉRIFIE ET CORRIGE :

1. CAMÉRA
   - Le composant utilise-t-il navigator.mediaDevices.getUserMedia ? Si oui, c'est la bonne approche.
   - Si le composant utilise une librairie tierce (html5-qrcode, react-qr-reader, etc.), vérifie qu'elle est dans package.json
   - Si AUCUNE librairie de scan n'est présente, installe et intègre une solution :
     Option recommandée : utilise l'API BarcodeDetector native (supportée Chrome/Edge mobile) avec fallback sur une librairie
   - La caméra demandée doit être la caméra arrière (facingMode: 'environment')
   - Permission caméra : gérer le cas où l'utilisateur refuse → message clair "Pour scanner, autorisez l'accès à la caméra dans les paramètres de votre navigateur"
   - HTTPS obligatoire pour getUserMedia (pas de problème sur Vercel, mais note pour le dev local)

2. DÉCODAGE QR
   - Quand un QR code est détecté, extraire le qr_token
   - Appeler la RPC get_carte_by_qr(qr_token) via Supabase
   - Gérer les retours :
     Carte trouvée et active → afficher les infos (prénom, nom, ville, formule, expiration)
     Carte non trouvée → "Carte non reconnue"
     Carte expirée → "Cette carte est expirée depuis le [date]"
     Erreur réseau → "Impossible de vérifier la carte. Vérifiez votre connexion."

3. FEEDBACK VISUEL
   - Succès : card verte avec check animé + infos du résident
   - Erreur : card rouge avec message
   - Scanner actif : cadre animé qui montre la zone de scan
   - Vibration sur mobile au scan réussi (navigator.vibrate(200) si supporté)
   - Son optionnel (un petit "beep" de confirmation)

4. ENREGISTREMENT DE LA VISITE
   Après un scan réussi et affiché :
   - Bouton "Valider la visite" qui INSERT dans la table visites :
     carte_id, commerce_id (à déterminer — le commerçant est-il identifié ?), ville_id, source: 'qr'
   - Si le commerçant n'est pas connecté, il faut un moyen d'identifier le commerce :
     Option A : le commerçant est connecté (meilleur)
     Option B : un code commerce est saisi manuellement
     Vérifie quelle option est implémentée et assure-toi qu'elle fonctionne

5. UX MOBILE
   - Le scan doit fonctionner en plein écran (ou presque) sur mobile
   - Pas de scroll nécessaire pour voir la caméra + le résultat
   - Bouton "Nouveau scan" après chaque résultat pour revenir à la caméra
   - Le design doit être minimaliste — focus sur la caméra et le résultat

6. GESTION DU CYCLE DE VIE
   - La caméra doit se couper quand on quitte la page (cleanup dans useEffect return)
   - La caméra doit se couper quand un scan est réussi (pas besoin de continuer à scanner)
   - Si l'utilisateur revient sur la page, la caméra se relance

Corrige tout ce qui ne fonctionne pas.
Montre-moi le Scan.jsx final complet.
```

---

## ═══════════════════════════════════════════════════
## PA-6 — SEO, SITEMAP ET TITRES DYNAMIQUES
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md sections 15 "DESIGN SYSTEM" et 19 "COMMANDES UTILES".

Le SEO est crucial pour qu'une mairie ou un commerçant qui google "plateforme locale Sanary" tombe sur nous. Et les titres dynamiques donnent une impression de qualité.

ÉTAPE 1 : TITRES DYNAMIQUES PAR PAGE

Crée un hook src/hooks/usePageTitle.js :

import { useEffect } from 'react';

export default function usePageTitle(title) {
  useEffect(() => {
    const base = 'Réseaux-Résident';
    document.title = title ? `${title} — ${base}` : base;
    return () => { document.title = base; };
  }, [title]);
}

Ensuite, ajoute usePageTitle dans CHAQUE page :
- Home.jsx → usePageTitle() (titre par défaut, juste "Réseaux-Résident — Votre ville, connectée")
- Ville.jsx → usePageTitle(ville.nom) → "Sanary-sur-Mer — Réseaux-Résident"
- Commercants.jsx → usePageTitle('Commerces partenaires')
- Rejoindre.jsx → usePageTitle('Rejoindre le réseau')
- Inscription.jsx → usePageTitle('Inscription')
- Connexion.jsx → usePageTitle('Connexion')
- InscriptionCompte.jsx → usePageTitle('Créer un compte')
- MonEspace.jsx → usePageTitle('Mon espace')
- MonCommerce.jsx → usePageTitle('Mon commerce')
- Dashboard.jsx → usePageTitle('Administration')
- Scan.jsx → usePageTitle('Scanner une carte')
- CGV.jsx → usePageTitle('Conditions générales')
- Confidentialite.jsx → usePageTitle('Politique de confidentialité')
- NotFound (404) → usePageTitle('Page introuvable')
- Et toute autre page existante

ÉTAPE 2 : META DESCRIPTION DYNAMIQUE

Dans le même hook, ajoute la possibilité de changer la meta description :

export default function usePageMeta(title, description) {
  useEffect(() => {
    const base = 'Réseaux-Résident';
    document.title = title ? `${title} — ${base}` : `${base} — Votre ville, connectée`;

    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      const original = meta?.content;
      if (meta) meta.content = description;
      return () => { if (meta && original) meta.content = original; };
    }
  }, [title, description]);
}

Utilise sur les pages clés :
- Ville.jsx → usePageMeta(ville.nom, `Découvrez les commerces et événements de ${ville.nom} sur Réseaux-Résident.`)
- Commercants.jsx → usePageMeta('Commerces partenaires', 'Trouvez les commerces partenaires de votre ville et profitez de réductions exclusives.')
- Home.jsx → usePageMeta(null, null) // utilise la meta par défaut de index.html

ÉTAPE 3 : CRÉE public/sitemap.xml

Crée un sitemap statique (suffisant pour le lancement) :

<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://reseaux-resident.fr/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://reseaux-resident.fr/commercants</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://reseaux-resident.fr/commercants/rejoindre</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://reseaux-resident.fr/inscription</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://reseaux-resident.fr/villes/sanary</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>https://reseaux-resident.fr/cgv</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://reseaux-resident.fr/confidentialite</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>

ÉTAPE 4 : CRÉE public/robots.txt

User-agent: *
Allow: /
Disallow: /mon-espace
Disallow: /mon-commerce
Disallow: /mon-association
Disallow: /mairie
Disallow: /dashboard
Disallow: /scan
Disallow: /api/
Sitemap: https://reseaux-resident.fr/sitemap.xml

ÉTAPE 5 : STRUCTURED DATA (JSON-LD)

Dans index.html, ajoute dans le <head> :

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Réseaux-Résident",
  "description": "La plateforme de vie locale qui connecte résidents, commerçants, associations et mairie.",
  "url": "https://reseaux-resident.fr",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR"
  },
  "author": {
    "@type": "Organization",
    "name": "Réseaux-Résident"
  }
}
</script>

Montre-moi tous les fichiers créés/modifiés.
```

---

## ═══════════════════════════════════════════════════
## PA-7 — EMAIL DE CONFIRMATION (RESEND)
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md et ouvre api/send-confirmation-email.js.

Les emails transactionnels sont critiques pour l'expérience utilisateur. Vérifie et améliore le système.

ÉTAPE 1 : VÉRIFIE api/send-confirmation-email.js

1. Le service email utilisé est-il Resend ? Si oui, vérifie :
   - import Resend from 'resend' OU utilisation de l'API REST
   - process.env.RESEND_API_KEY est utilisé
   - Le from utilise process.env.RESEND_FROM_EMAIL ou un fallback

2. Si le service email est autre chose (SendGrid, Mailgun, nodemailer), documente-le mais ne change pas — ce qui marche marche.

3. Vérifie le template HTML de l'email :
   - Le nom "Réseaux-Résident" apparaît (pas "Carte Résident")
   - Le design est propre (couleurs cohérentes, logo ou titre, bouton CTA)
   - Le contenu est en français
   - L'email est responsive (s'affiche bien sur mobile)

ÉTAPE 2 : CRÉE UN TEMPLATE EMAIL RÉUTILISABLE

Crée api/lib/email-template.js :

export function wrapEmailTemplate(content, { title = 'Réseaux-Résident' } = {}) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#2563EB;font-size:24px;margin:0;">Réseaux-Résident</h1>
      <p style="color:#6B7280;font-size:14px;margin:4px 0 0;">${title}</p>
    </div>
    <div style="background:#FFFFFF;border-radius:12px;padding:32px;border:1px solid #E5E7EB;">
      ${content}
    </div>
    <div style="text-align:center;margin-top:32px;color:#9CA3AF;font-size:12px;">
      <p>© 2026 Réseaux-Résident. Tous droits réservés.</p>
      <p>Vous recevez cet email car vous êtes inscrit sur Réseaux-Résident.</p>
    </div>
  </div>
</body>
</html>`;
}

export function confirmationCardEmail({ prenom, numero, ville, formule }) {
  return wrapEmailTemplate(`
    <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Bienvenue ${prenom} !</h2>
    <p style="color:#374151;line-height:1.6;">Votre carte résident pour <strong>${ville}</strong> est maintenant active.</p>
    <div style="background:#EFF6FF;border-radius:8px;padding:16px;margin:24px 0;text-align:center;">
      <p style="color:#6B7280;font-size:12px;margin:0;">Numéro de carte</p>
      <p style="color:#2563EB;font-size:24px;font-weight:bold;margin:4px 0;">${numero}</p>
      <p style="color:#6B7280;font-size:12px;margin:0;">Formule : ${formule}</p>
    </div>
    <p style="color:#374151;line-height:1.6;">Rendez-vous sur votre espace pour accéder à votre carte digitale et découvrir les offres de vos commerçants.</p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${process.env.APP_URL || 'https://reseaux-resident.fr'}/mon-espace" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">Accéder à mon espace</a>
    </div>
  `, { title: 'Confirmation de carte' });
}

ÉTAPE 3 : METS À JOUR send-confirmation-email.js

Utilise les templates pour que l'email envoyé soit professionnel :
- Import confirmationCardEmail
- Passe les données (prenom, numero, ville, formule)
- Sujet : "Votre carte Réseaux-Résident est active !"

ÉTAPE 4 : AJOUTE RESEND_FROM_EMAIL À .env.example

Si pas déjà fait :
RESEND_FROM_EMAIL=notifications@reseaux-resident.fr

Note dans un commentaire : "En dev, utilisez 'onboarding@resend.dev' qui est autorisé sans domaine vérifié."

Montre-moi tous les fichiers créés/modifiés.
```

---

## ═══════════════════════════════════════════════════
## PA-8 — MONITORING ET DÉPLOIEMENT FINAL
## ═══════════════════════════════════════════════════

```
Lis CLAUDE.md sections 14 "RÈGLES DE TRAVAIL" et 19 "COMMANDES UTILES".

Dernière étape avant le lancement. On prépare le monitoring, on vérifie le build, et on finalise la config Vercel.

ÉTAPE 1 : GESTION D'ERREURS GLOBALE

Crée src/components/ErrorBoundary.jsx :

import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erreur application:', error, errorInfo);
    // Futur : envoyer à Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Quelque chose s'est mal passé</h1>
            <p className="text-gray-500 mb-6">Nous sommes désolés, une erreur inattendue est survenue.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

Intègre dans src/main.jsx :
<ErrorBoundary>
  <AuthProvider>
    <App />
  </AuthProvider>
</ErrorBoundary>

ÉTAPE 2 : VÉRIFIE vercel.json

Le fichier doit contenir :

{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Permissions-Policy", "value": "camera=(self), geolocation=(self)" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, no-cache" }
      ]
    },
    {
      "source": "/(.*\\.(?:js|css|png|svg|ico|webp|woff2))",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}

Vérifie que les rewrites n'interceptent PAS les routes /api/*.

ÉTAPE 3 : METS À JOUR README.md

Réécris README.md avec :

# Réseaux-Résident

> La plateforme de vie locale qui connecte résidents, commerçants, associations et mairie.

## Stack technique
- React 18 + Vite 5
- TailwindCSS 3.4
- Supabase (PostgreSQL, Auth, Storage)
- Stripe (paiements)
- Vercel (hébergement + serverless)

## Démarrage
```bash
cp .env.example .env.local
# Remplissez les variables avec vos clés
npm install
npm run dev
```

## Déploiement
Push sur `main` → déploiement automatique Vercel.

## Structure
Voir CLAUDE.md pour la documentation technique complète.

## Licence
Propriétaire — © 2026 Réseaux-Résident

ÉTAPE 4 : VÉRIFIE LE BUILD FINAL

Fais une vérification mentale complète :

1. Parcours chaque fichier dans src/ et vérifie :
   - Aucun import vers un fichier qui n'existe pas
   - Aucun composant utilisé mais pas importé
   - Aucune variable non définie
   - Aucun console.log restant (seulement console.error dans les catch)

2. Parcours App.jsx et vérifie :
   - Chaque route pointe vers un composant existant
   - Les ProtectedRoute ont les bons rôles
   - Le Layout enveloppe correctement les pages
   - Le Suspense/lazy est en place pour les pages lourdes

3. Parcours les serverless functions et vérifie :
   - Chaque function valide la méthode HTTP
   - Chaque function a un try/catch
   - Chaque function utilise les bonnes variables d'environnement
   - Aucune function n'expose de secret dans la réponse

Produis un tableau final :

| Catégorie | Statut | Détail |
|---|---|---|
| Build | ✅/❌ | npm run build passe sans erreur |
| Routes | ✅/❌ | Toutes les routes fonctionnelles |
| Auth | ✅/❌ | Inscription + connexion + rôles |
| Supabase | ✅/❌ | Queries alignées avec le schéma |
| Stripe | ✅/❌ | Cartes physiques + premium |
| PWA | ✅/❌ | Manifest + SW + Install |
| SEO | ✅/❌ | Titres + meta + sitemap + robots |
| Sécurité | ✅/❌ | RLS + secrets + headers |
| Emails | ✅/❌ | Template + envoi |
| Responsive | ✅/❌ | 375px + 768px + 1280px |
| a11y | ✅/❌ | Clavier + ARIA + contrastes |
| Français | ✅/❌ | 100% textes utilisateur en français |

Si tout est ✅ → "Projet prêt pour le déploiement production."
Si des ❌ → liste les corrections restantes avec le fichier et la ligne.
```

---

## ═══════════════════════════════════════════════════
## PLAN D'EXÉCUTION
## ═══════════════════════════════════════════════════

```
SESSION 1 : PA-1 (migration vérifiée)
            → Exécute migration-v4.sql dans Supabase Dashboard
            
SESSION 2 : PA-2 (auth durcie)
            → Teste : inscription → connexion → redirect → déconnexion
            
SESSION 3 : PA-3 (variables env)
            → Configure les variables dans Vercel Dashboard
            
SESSION 4 : PA-4 (Stripe complet)
            → Crée les Price IDs dans Stripe Dashboard
            → Configure le webhook Stripe dans Stripe Dashboard
            
SESSION 5 : PA-5 (scan QR)
            → Teste sur un vrai téléphone avec la caméra
            
SESSION 6 : PA-6 (SEO)
            → Après deploy, vérifie avec Google Search Console
            
SESSION 7 : PA-7 (emails)
            → Teste en envoyant un vrai email de confirmation
            
SESSION 8 : PA-8 (déploiement)
            → Push sur main → vérifie sur reseaux-resident.fr
```

### Après ces 8 sessions → le site est EN PRODUCTION
### Puis → lance les prompts de PROMPTS-CLAUDE-CODE.md Phase 1 à 4 pour construire les nouvelles fonctionnalités
