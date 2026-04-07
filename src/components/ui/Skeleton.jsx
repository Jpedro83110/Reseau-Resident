// Composants skeleton pour les états de chargement

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="h-32 bg-gray-200 rounded-lg mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-100 rounded w-1/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
          <div className="h-8 bg-gray-100 rounded w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(lines)].map((_, i) => (
        <div key={i} className={`h-3 bg-gray-200 rounded ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };
  return <div className={`${sizes[size]} bg-gray-200 rounded-full animate-pulse`} />;
}
