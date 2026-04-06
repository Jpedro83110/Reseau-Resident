import { useState, useEffect, useCallback } from 'react';
import { getVilles, getVilleBySlug, getStatsMensuelles, getAdminDashboard } from '../lib/api';
import { captureError } from '../lib/sentry';

function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    asyncFn()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((error) => { captureError(error, 'useAsync'); if (!cancelled) setState({ data: null, loading: false, error }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useVilles() { return useAsync(getVilles, []); }

export function useVille(slug) {
  const fn = useCallback(() => getVilleBySlug(slug), [slug]);
  return useAsync(fn, [slug]);
}

export function useStatsMensuelles(villeId) {
  const fn = useCallback(() => (villeId ? getStatsMensuelles(villeId) : Promise.resolve([])), [villeId]);
  return useAsync(fn, [villeId]);
}

export function useAdminDashboard(villeSlug) {
  const fn = useCallback(() => (villeSlug ? getAdminDashboard(villeSlug) : Promise.resolve(null)), [villeSlug]);
  return useAsync(fn, [villeSlug]);
}
