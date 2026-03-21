# Carte Résident v3.0

Programme de fidélité local multi-villes. PWA installable.

## Déploiement rapide

1. **Supabase** : SQL Editor → `migration-v3.sql`
2. **Admin** : Auth > Users > créer user → `INSERT INTO admins (id, email) VALUES ('uuid', 'email');`
3. **Stripe** : copier `pk_test_` + `sk_test_`
4. **Variables** : `.env.local` + Vercel (voir `.env.example`)
5. **Webhook** : Stripe > Webhooks > `https://domain/api/stripe-webhook` > `payment_intent.succeeded`
6. `npm install && npm run dev`

## Sécurité

- Prix déterminé côté serveur (pas le front)
- Webhook Stripe = source de vérité paiement (idempotent)
- Scan via RPCs sécurisées (anti-doublon, vérification ville)
- Admin = Supabase Auth (plus de mot de passe client)
- RLS durci sur toutes les tables
- Email lu depuis la BDD (pas de trust front)
