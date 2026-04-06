import { Link } from 'react-router-dom';

export default function VilleCard({ ville }) {
  const isActif = ville.statut === 'actif';
  return (
    <Link to={`/villes/${ville.slug}`}
      className={`block rounded-2xl p-6 border-2 transition-all group ${isActif ? 'bg-bleu border-bleu hover:bg-bleu-clair hover:border-bleu-clair hover:-translate-y-1 shadow-lg hover:shadow-xl' : 'bg-white border-dashed border-gray-300 hover:border-gray-400 cursor-default opacity-75'}`}
      tabIndex={isActif ? 0 : -1}>
      <div className="flex justify-between items-start mb-4">
        <h3 className={`font-serif text-xl font-bold ${isActif ? 'text-white' : 'text-texte'}`}>{ville.nom}</h3>
        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${isActif ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {isActif ? 'Actif' : 'Bientôt'}
        </span>
      </div>
      {isActif && (
        <div className="space-y-1">
          <p className="text-blue-200 text-sm">{ville.commerces_partenaires} commerces partenaires</p>
          <p className="text-blue-200 text-sm">{ville.cartes_actives} résidents équipés</p>
        </div>
      )}
      {!isActif && <p className="text-gray-500 text-sm">{ville.description}</p>}
    </Link>
  );
}
