// src/components/LoadingSpinner.jsx
// Spinner de chargement réutilisable avec message optionnel

export default function LoadingSpinner({ message = 'Chargement...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-bleu" />
      <p className="mt-3 text-sm text-gray-500">{message}</p>
    </div>
  );
}
