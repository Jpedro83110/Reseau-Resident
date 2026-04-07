export default function FormField({ label, error, required, children, hint }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Classe utilitaire pour les inputs — empêche le zoom iOS (font >= 16px)
export const inputClass = 'w-full h-12 px-3 text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-bleu/20 focus:border-bleu transition-colors';
export const textareaClass = 'w-full px-3 py-3 text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-bleu/20 focus:border-bleu transition-colors resize-none';
export const selectClass = 'w-full h-12 px-3 text-base border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-bleu/20 focus:border-bleu transition-colors';
