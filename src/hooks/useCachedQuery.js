// src/hooks/useCachedQuery.js
// Hook qui wrappe les appels Supabase avec un cache en mémoire (stale-while-revalidate)
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getCached, setCache } from '../lib/cache';

export default function useCachedQuery(key, queryFn, options = {}) {
  const { ttl = 60000, enabled = true } = options;
  const [data, setData] = useState(() => getCached(key));
  const [isLoading, setIsLoading] = useState(!getCached(key) && enabled);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) { setIsLoading(false); return; }

    const cached = getCached(key);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      // Stale-while-revalidate : on recharge en arrière-plan
    }

    let cancelled = false;
    (async () => {
      try {
        if (!cached) setIsLoading(true);
        const result = await queryFn(supabase);
        if (cancelled || !mountedRef.current) return;
        if (result.error) throw result.error;
        setCache(key, result.data, ttl);
        setData(result.data);
        setError(null);
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        setError(err.message || 'Erreur de chargement');
        console.error(`Erreur query ${key}:`, err);
      } finally {
        if (!cancelled && mountedRef.current) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => {
    setCache(key, null, 0);
    setIsLoading(true);
    setError(null);
    queryFn(supabase).then((result) => {
      if (!mountedRef.current) return;
      if (result.error) { setError(result.error.message); return; }
      setCache(key, result.data, ttl);
      setData(result.data);
    }).catch((err) => {
      if (mountedRef.current) setError(err.message);
    }).finally(() => {
      if (mountedRef.current) setIsLoading(false);
    });
  }, [key, queryFn, ttl]);

  return { data, isLoading, error, refetch };
}
