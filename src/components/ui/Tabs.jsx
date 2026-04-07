import { useRef, useEffect } from 'react';

export default function Tabs({ tabs, activeTab, onChange }) {
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  // Scroll vers l'onglet actif sur mobile
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory border-b border-gray-200 -mx-4 px-4 md:mx-0 md:px-0"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : null}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`
              snap-start flex-shrink-0 flex items-center gap-2
              px-4 py-3 min-h-[44px] text-sm font-medium
              border-b-2 transition-colors whitespace-nowrap
              ${isActive
                ? 'border-bleu text-bleu'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `.trim()}
          >
            {tab.icon && <tab.icon size={16} />}
            {tab.label}
            {tab.badge != null && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-bleu/10 text-bleu' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
