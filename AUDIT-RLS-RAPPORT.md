# AUDIT RLS COMPLET — Reseaux-Resident

**Date** : 2026-04-05  
**Fichier correctif** : `sql/audit-rls-complet.sql`

---

## Synthese par table

| Table | RLS | SELECT | INSERT | UPDATE | DELETE | Statut |
|-------|-----|--------|--------|--------|--------|--------|
| `admins` | OK | OK (own) | service_role | service_role | service_role | OK |
| `villes` | OK | OK (public) | OK (admin) | OK (admin+mairie) | admin | OK |
| `commerces` | OK | OK (public) | OK (admin) | OK (admin) | service_role | Corrige |
| `cartes` | OK | OK (own+admin) | OK (anon) | service_role | service_role | Corrige |
| `visites` | OK | OK (admin) | RPC only | - | - | OK |
| `commercants_inscrits` | OK | Corrige (own+admin) | OK (anon) | OK (admin) | admin | Corrige |
| `liste_attente` | OK | admin | OK (anon) | - | - | OK |
| `profiles` | OK | OK (own+admin) | OK (own) | OK (own) | Corrige (own) | Corrige |
| `commercant_profiles` | OK | OK (own) | OK (own+admin) | OK (own) | Corrige (own) | Corrige |
| `association_profiles` | OK | OK (own) | OK (own) | OK (own) | Corrige (own) | Corrige |
| `mairie_profiles` | OK | OK (own+admin) | OK (own+admin) | OK (own) | Corrige (own) | Corrige |
| `offres` | OK | OK (public actif) | Corrige (commercant) | Corrige (commercant) | Corrige (commercant) | Corrige |
| `evenements` | OK | OK (public publie) | Corrige (mairie) | Corrige (mairie) | Corrige (mairie) | Corrige |
| `actualites` | OK | OK (public publie) | Corrige (mairie+commercant) | Corrige (mairie+commercant) | Corrige (mairie) | Corrige |
| `associations` | OK | OK (public actif) | OK (auth) | OK (responsable) | admin | OK |
| `projets` | OK | OK (public actif) | OK (asso) | OK (asso) | admin | OK |
| `soutiens` | OK | OK (public) | OK (own) | - | - | OK |
| `favoris` | OK | OK (own) | OK (own) | OK (own) | Corrige (own) | Corrige |
| `notifications` | OK | OK (own) | admin/service | OK (own lu) | Corrige (own) | Corrige |
| `parrainages` | OK | OK (own) | OK (own) | service_role | service_role | OK |
| `campagnes` | OK | Corrige (commercant) | Corrige (commercant) | OK (commercant) | OK (commercant) | Corrige |
| `badges` | OK | OK (public) | service_role | service_role | service_role | OK |
| `badges_utilisateurs` | OK | OK (own) | service_role | service_role | service_role | OK |
| `defis` | OK | OK (public actif) | Corrige (mairie) | admin/mairie | admin | Corrige |
| `defis_participants` | OK | OK (own) | OK (own) | OK (own) | service_role | OK |
| `mairies_inscrites` | OK | OK (own+admin) | OK (anon) | OK (admin) | OK (admin) | OK |
| `codes_mensuels` | OK | Corrige (commercant) | service_role | service_role | service_role | Corrige |
| `cartes_cadeaux` | OK | Corrige (own) | OK (anon) | service_role | service_role | Corrige |
| `inscriptions_evenements` | OK | OK (own) | OK (own) | OK (own) | service_role | OK |
| `avis` | OK | OK (public publie) | OK (own) | Corrige (own+commercant) | admin | Corrige |
| `messages` | OK | OK (own+admin) | OK (own) | admin | admin | OK |

---

## Failles corrigees

### Critiques (6)

| # | Table | Faille | Correction |
|---|-------|--------|------------|
| 1 | `cartes` | `cartes_update_payment` permet activation sans paiement par n'importe quel anonyme | Supprimee — activation uniquement via webhook Stripe (service_role) |
| 2 | `cartes_cadeaux` | `cadeaux_update_payment` idem | Supprimee |
| 3 | `offres` | `offres_insert_auth WITH CHECK (TRUE)` permet a tout authentifie de creer des offres pour n'importe quel commerce | Remplacee par `offres_commercant_manage` verifiant commerce_id |
| 4 | `evenements` | `evenements_insert_auth WITH CHECK (TRUE)` idem | Remplacee par `evenements_mairie_manage` verifiant ville_id |
| 5 | `actualites` | `actualites_insert_auth WITH CHECK (TRUE)` idem | Remplacee par `actualites_mairie_manage` + `actualites_commercant_manage` |
| 6 | `utilisations_cadeaux` | Insertion libre par anonyme | Limitee a service_role |

### Importantes (8)

| # | Table | Faille | Correction |
|---|-------|--------|------------|
| 7 | `commercants_inscrits` | Emails/telephones exposes au public via `ci_read` | Remplacee par `commercants_select_own` (own email + admin) |
| 8 | `codes_mensuels` | Codes valides exposes au public | Remplacee par `codes_select_commerce` (commercant + admin) |
| 9 | `cartes_cadeaux` | Codes cadeaux exposes au public | Remplacee par `cadeaux_select_own` (acheteur + admin) |
| 10 | `avis` | `avis_update_commerce USING (TRUE)` permet a tout authentifie de modifier tous les avis | Remplacee par `avis_update_own` + `avis_commercant_reply` |
| 11 | `campagnes` | `camp_insert_auth WITH CHECK (TRUE)` + `camp_select_auth USING (TRUE)` | Supprimees — seuls les commercants proprietaires |
| 12 | `defis` | `defis_insert_auth WITH CHECK (TRUE)` | Remplacee par `defis_mairie_manage` verifiant ville_id |
| 13 | `profiles` | Pas de DELETE (RGPD) | Ajoutee `profiles_delete_own` |
| 14 | `commercant_profiles` / `association_profiles` / `mairie_profiles` | Pas de DELETE | Ajoutees `*_delete_own` |

---

## Source du probleme

Le fichier `sql/fix-rls-permissions.sql` a ete cree pour resoudre des erreurs "permission denied" mais a introduit des policies catastrophiquement permissives (`WITH CHECK (TRUE)`, `USING (TRUE)`) sur les tables `offres`, `evenements`, `actualites`, `campagnes`, `defis`. Ce fichier est la source principale des 6 failles critiques.

Le fichier `sql/audit-rls-complet.sql` corrige toutes ces failles en :
1. Supprimant les policies trop permissives
2. Les remplacant par des policies qui verifient l'identite du proprietaire (commerce_id, ville_id, profile_id)
3. Ajoutant les policies DELETE manquantes pour la conformite RGPD
4. Ajoutant des policies admin et service_role sur toutes les tables

---

## Action requise

Executer `sql/audit-rls-complet.sql` dans **Supabase Dashboard > SQL Editor**.

Ce script est 100% idempotent — il peut etre execute plusieurs fois sans erreur.
