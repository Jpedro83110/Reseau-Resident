# Carte Résident — v2.0

Programme de fidélité local multi-villes pour soutenir les commerces de proximité.

## Déploiement — 6 étapes

### 1. Supabase
1. Créez un projet sur [supabase.com](https://supabase.com)
2. **SQL Editor** → collez tout `supabase-schema.sql` → **Run**
3. Récupérez vos clés dans **Settings > API** : `Project URL` + `anon public key`

### 2. Créer un admin
1. Dans **Authentication > Users**, créez un utilisateur (email + password)
2. Copiez son UUID
3. Dans **SQL Editor**, exécutez :
```sql
INSERT INTO admins (id, email) VALUES ('votre-uuid', 'admin@carte-resident.fr');
```

### 3. Stripe
1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers > API keys**
2. Copiez `Publishable key` (pk_test_...) et `Secret key` (sk_test_...)

### 4. Variables d'environnement
```bash
cp .env.example .env.local
# Remplissez les 3 valeurs VITE_*
```

### 5. Test local
```bash
npm install
npm run dev
```
Ouvrez http://localhost:3000

### 6. Déploiement Vercel
```bash
git init && git add . && git commit -m "v2.0"
git remote add origin https://github.com/votre-user/carte-resident.git
git push -u origin main
```
Sur [vercel.com](https://vercel.com) :
- Importez le projet
- Ajoutez les **Environment Variables** :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY` (sans préfixe VITE_)
- Déployez

---

## Fonctionnalités v2.0

### Résidents
- Inscription en ligne avec paiement Stripe sécurisé
- Choix carte **physique**, **digitale** (QR code), ou **les deux**
- 4 formules : Individuel (10€), Couple (15€), Famille (20€), Secondaire (20€)
- QR code unique par carte pour le scan commerçant
- Commande par téléphone pour les seniors

### Commerçants
- Inscription gratuite depuis **n'importe quelle ville** (même pas encore active)
- Page `/scan?token=xxx` pour scanner le QR code d'un résident
- Validation de visite en 2 clics (sélection commerce + valider)
- Source de visite trackée (QR, code mensuel, carnet, NFC, téléphone)

### Dashboard admin
- Villes chargées dynamiquement (plus de hardcode)
- KPIs : cartes actives, commerces, visites, revenus
- Graphique évolution mensuelle (agrégé côté serveur via RPC)
- Répartition par catégorie de commerce
- Export CSV

### Cartes cadeaux
- Table `cartes_cadeaux` avec suivi du solde
- Montants : 10€, 20€, 30€
- Suivi des utilisations par commerce

### Sécurité
- **RLS durci** : les anon ne peuvent plus activer des cartes sans payer
- **Stats agrégées côté serveur** via fonctions RPC (pas de leak de données)
- **QR token cryptographique** (32 chars hex) impossible à deviner
- **Admin auth** via table `admins` liée à Supabase Auth
- Variables sensibles uniquement côté Vercel Functions

---

## Structure
```
carte-resident/
├── api/
│   └── create-payment-intent.js    # Vercel Function Stripe
├── src/
│   ├── components/                  # CarteVisuelle, Search, Tarifs...
│   ├── hooks/useData.js            # Hooks React
│   ├── lib/
│   │   ├── api.js                  # Couche données Supabase
│   │   ├── stripe.js               # Config Stripe
│   │   └── supabase.js             # Client Supabase singleton
│   ├── pages/
│   │   ├── Home.jsx                # Accueil + recherche ville
│   │   ├── villes/Ville.jsx        # Page ville dynamique
│   │   ├── inscription/            # Parcours inscription 4 étapes
│   │   ├── commercants/            # Espace commerçant + formulaire
│   │   ├── dashboard/              # Stats admin
│   │   ├── scan/Scan.jsx           # Scan QR code commerçant
│   │   ├── CGV.jsx
│   │   └── Confidentialite.jsx
│   ├── App.jsx                     # Router
│   └── main.jsx                    # Point d'entrée
├── supabase-schema.sql             # Script SQL complet v2.0
└── package.json
```

## Stack
| Technologie | Usage |
|---|---|
| React 18 + Vite | Interface + build |
| Tailwind CSS 3 | Styles |
| Framer Motion | Animations |
| React Router 6 | Navigation |
| Recharts | Graphiques |
| Supabase | BDD + Auth + RLS |
| Stripe | Paiements |
| Vercel | Hébergement + Functions |
