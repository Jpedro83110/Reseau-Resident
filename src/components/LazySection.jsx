// src/components/LazySection.jsx
// Charge les enfants uniquement quand la section est visible (ou proche de l'être)
import { useState, useEffect, useRef } from 'react';

export default function LazySection({ children, height = 200, className = '' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback si IntersectionObserver n'est pas disponible
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (inView) return <div className={className}>{children}</div>;

  return (
    <div ref={ref} className={className} style={{ minHeight: height }}>
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-bleu" />
      </div>
    </div>
  );
}
