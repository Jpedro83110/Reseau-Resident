// src/hooks/useDebounce.js
// Debounce une valeur avec un délai configurable
import { useState, useEffect } from 'react';

export default function useDebounce(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
