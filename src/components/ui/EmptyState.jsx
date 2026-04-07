export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon size={28} className="text-gray-300" />
        </div>
      )}
      <h3 className="text-base font-semibold text-texte mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction}
          className="mt-4 px-4 py-2.5 min-h-[44px] bg-bleu text-white rounded-lg text-sm font-medium hover:bg-bleu-clair transition-colors active:scale-[0.98]">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
