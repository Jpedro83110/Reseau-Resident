/**
 * analytics.js — PostHog analytics pour Réseaux-Résident
 * Conditionnel : n'envoie rien si VITE_POSTHOG_KEY n'est pas défini.
 */
import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com';
let initialized = false;

export function initAnalytics() {
  if (!key || initialized) return;
  posthog.init(key, {
    api_host: host,
    capture_pageview: false, // On le fait manuellement via le router
    capture_pageleave: true,
    persistence: 'localStorage',
    autocapture: false, // Désactivé pour contrôle fin
  });
  initialized = true;
}

/**
 * Track un événement custom
 * @param {string} name — nom de l'événement (ex: 'signup_completed')
 * @param {object} properties — données associées
 */
export function trackEvent(name, properties = {}) {
  if (!initialized) return;
  posthog.capture(name, properties);
}

/**
 * Track une page vue (appelé automatiquement par le Layout)
 * @param {string} path — pathname actuel
 */
export function trackPageView(path) {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: window.location.href, path });
}

/**
 * Identifier l'utilisateur après login
 * @param {string} userId — UUID Supabase
 * @param {object} traits — { email, prenom, nom, roles, ville }
 */
export function identifyUser(userId, traits = {}) {
  if (!initialized || !userId) return;
  posthog.identify(userId, {
    email: traits.email,
    name: `${traits.prenom || ''} ${traits.nom || ''}`.trim(),
    roles: traits.roles,
    ville: traits.ville,
  });
}

/**
 * Reset l'identité (au logout)
 */
export function resetUser() {
  if (!initialized) return;
  posthog.reset();
}
