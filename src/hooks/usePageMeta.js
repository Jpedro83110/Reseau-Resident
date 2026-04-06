// src/hooks/usePageMeta.js
// Hook pour définir le titre de page et la meta description dynamiquement.
// Usage : usePageMeta('Mon commerce', 'Gérez votre fiche commerçant.')
import { useEffect } from 'react';

const BASE_TITLE = 'Réseaux-Résident';
const DEFAULT_TITLE = `${BASE_TITLE} — Votre ville, connectée`;

export default function usePageMeta(title, description) {
  useEffect(() => {
    // Titre
    document.title = title ? `${title} — ${BASE_TITLE}` : DEFAULT_TITLE;

    // Meta description
    let originalDesc;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        originalDesc = meta.content;
        meta.content = description;
      }
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (originalDesc) {
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.content = originalDesc;
      }
    };
  }, [title, description]);
}
