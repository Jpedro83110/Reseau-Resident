import * as SentryModule from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
const isProd = import.meta.env.PROD;
const environment = import.meta.env.VITE_ENV || (isProd ? 'production' : 'development');

const sentryEnabled = !!dsn;

if (sentryEnabled) {
  SentryModule.init({
    dsn,
    environment,
    release: `reseaux-resident@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Performance : 10% des transactions en prod, 100% en dev
    tracesSampleRate: isProd ? 0.1 : 1.0,

    // Session Replay : 10% des sessions en prod
    replaysSessionSampleRate: isProd ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Ne pas capturer les erreurs de réseau Supabase récurrentes
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        return null;
      }
      return event;
    },
  });
}

export { SentryModule as Sentry, sentryEnabled };

/**
 * Capture une erreur dans la console ET dans Sentry.
 * Usage : import { captureError } from '../lib/sentry';
 *         catch (err) { captureError(err, 'contexte'); }
 */
export function captureError(error, context) {
  const msg = error?.message || error;
  console.error(`[${context || 'Erreur'}]`, msg);
  if (sentryEnabled && error instanceof Error) {
    SentryModule.captureException(error, { tags: { context } });
  }
}
