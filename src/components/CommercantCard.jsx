import { Store, MapPin, Tag } from 'lucide-react';

export default function CommercantCard({ commerce }) {
  return (
    <article className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-or/30 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gris-clair flex items-center justify-center text-bleu shrink-0">
          <Store size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-bold text-texte truncate">{commerce.nom}</h3>
          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded mt-1">{commerce.categorie}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <Tag size={16} className="text-or shrink-0 mt-0.5" />
          <span className="text-texte font-medium">{commerce.avantage}</span>
        </div>
        {commerce.adresse && (
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <MapPin size={16} className="shrink-0 mt-0.5" />
            <span>{commerce.adresse}</span>
          </div>
        )}
      </div>
    </article>
  );
}
