// Tableau responsive : table sur desktop, cartes empilées sur mobile
export default function ResponsiveTable({ columns, data, actions, mobileCardRender, emptyMessage, loading }) {
  if (loading) return <SkeletonRows />;
  if (!data?.length) return (
    <div className="text-center py-12 text-gray-400 text-sm">{emptyMessage || 'Aucune donnée'}</div>
  );

  // Colonnes par priorité
  const priority1 = columns.filter((c) => c.priority === 1);
  const priority2 = columns.filter((c) => c.priority <= 2);

  return (
    <>
      {/* Desktop : tableau classique */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left">{col.label}</th>
              ))}
              {actions && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id || i} className="border-t border-gray-100 hover:bg-gray-50/50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {actions(row).map((action, j) => (
                        <button key={j} onClick={action.onClick}
                          className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                            action.variant === 'danger'
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-bleu hover:bg-blue-50'
                          }`}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablette : colonnes priorité 1+2 */}
      <div className="hidden md:block lg:hidden space-y-2">
        {data.map((row, i) => (
          <div key={row.id || i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {priority2.map((col) => (
                  <p key={col.key} className={`text-sm ${col.priority === 1 ? 'font-medium text-texte' : 'text-gray-500'} truncate`}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '')}
                  </p>
                ))}
              </div>
              {actions && (
                <div className="flex gap-1 shrink-0">
                  {actions(row).map((action, j) => (
                    <button key={j} onClick={action.onClick}
                      className={`px-3 py-2 min-h-[44px] rounded-lg text-xs font-medium transition-colors ${
                        action.variant === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-bleu hover:bg-blue-50'
                      }`}>
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile : cartes empilées */}
      <div className="md:hidden space-y-2">
        {data.map((row, i) => (
          <div key={row.id || i}>
            {mobileCardRender ? mobileCardRender(row) : (
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                {priority1.map((col) => (
                  <p key={col.key} className="text-sm font-medium text-texte truncate">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '')}
                  </p>
                ))}
                {columns.filter(c => c.priority > 1).map((col) => (
                  <div key={col.key} className="flex justify-between text-xs">
                    <span className="text-gray-400">{col.label}</span>
                    <span className="text-gray-700">{col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}</span>
                  </div>
                ))}
                {actions && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {actions(row).map((action, j) => (
                      <button key={j} onClick={action.onClick}
                        className={`flex-1 py-2.5 min-h-[44px] rounded-lg text-xs font-medium transition-colors ${
                          action.variant === 'danger' ? 'text-red-500 bg-red-50' : 'text-bleu bg-blue-50'
                        }`}>
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
