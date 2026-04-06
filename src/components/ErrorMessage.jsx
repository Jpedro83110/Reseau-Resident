// src/components/ErrorMessage.jsx
// Message d'erreur réutilisable avec bouton de réessai optionnel
import { AlertCircle } from 'lucide-react';

export default function ErrorMessage({ message = 'Une erreur est survenue', onRetry }) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
      <h3 className="mt-2 text-sm font-semibold text-gray-900">Oups !</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 bg-bleu hover:bg-bleu-clair text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
