import { useState, useEffect, useCallback } from 'react';
import { getVilles, getVilleBySlug, getStatsMensuelles, getDashboardStats } from '../lib/api';

function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    asyncFn()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (!cancelled) setState({ data: null, loading: false, error }); });
    return () => { cancelled = true; };
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

export function useDashboard(villeSlug) {
  const fn = useCallback(() => getDashboardStats(villeSlug), [villeSlug]);
  return useAsync(fn, [villeSlug]);
}
