import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ArrowRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVilles } from '../hooks/useData';
import { rechercherVille } from '../lib/adresse-gouv';

export default function SearchVille() {
  const [query, setQuery] = useState('');
  const [partenaires, setPartenaires] = useState([]);
  const [gouvResults, setGouvResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingGouv, setLoadingGouv] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const { data: villes } = useVilles();

  useEffect(() => {
    if (!query.trim() || !villes) { setPartenaires([]); return; }
    const q = query.toLowerCase();
    setPartenaires(villes.filter((v) => v.nom.toLowerCase().includes(q) || v.departement?.toLowerCase().includes(q)));
  }, [query, villes]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setGouvResults([]); setIsOpen(false); return; }
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingGouv(true);
      const results = await rechercherVille(query, { limit: 6 });
      const partenaireNoms = new Set((villes || []).map((v) => v.nom.toLowerCase()));
      const filtered = results.filter((r) => !partenaireNoms.has(r.nom.toLowerCase()));
      setGouvResults(filtered);
      setLoadingGouv(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, villes]);

  useEffect(() => {
    function handleClick(e) { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const hasResults = partenaires.length > 0 || gouvResults.length > 0;

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={wrapperRef}>
      <div className="relative flex items-center">
        <Search size={22} className="absolute left-4 text-gray-400 pointer-events-none" />
        <input type="search"
          className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-gray-200 focus:border-or focus:ring-4 focus:ring-or/20 transition-all outline-none shadow-sm bg-white"
          placeholder="Rechercher votre ville partout en France..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
        />
        {loadingGouv && <div className="absolute right-4 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-or border-t-transparent rounded-full animate-spin" /></div>}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-40 max-h-96 overflow-y-auto">
          {partenaires.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">Villes partenaires</div>
              <ul className="divide-y divide-gray-100">
                {partenaires.map((ville) => (
                  <li key={ville.id}>
                    <Link to={`/villes/${ville.slug}`} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                      onClick={() => { setIsOpen(false); setQuery(''); }}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${ville.statut === 'actif' ? 'bg-blue-50 text-bleu' : 'bg-gray-100 text-gray-500'}`}><MapPin size={20} /></div>
                        <div>
                          <div className="font-semibold text-lg text-texte">{ville.nom}</div>
                          <div className="text-sm text-gray-500">{ville.departement}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${ville.statut === 'actif' ? 'bg-green-100 text-vert' : 'bg-gray-100 text-gray-500'}`}>
                          {ville.statut === 'actif' ? 'Disponible' : 'Bientôt'}
                        </span>
                        <ArrowRight size={18} className="text-gray-300 group-hover:text-or transition-colors" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {gouvResults.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-t border-gray-100">Autres villes en France</div>
              <ul className="divide-y divide-gray-100">
                {gouvResults.map((r, i) => (
                  <li key={`gouv-${i}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 text-gray-400"><Building2 size={20} /></div>
                        <div>
                          <div className="font-semibold text-texte">{r.nom}</div>
                          <div className="text-sm text-gray-500">{r.codePostal} · {r.departement}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-orange-50 text-or">Pas encore</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!hasResults && query.length >= 2 && !loadingGouv && (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-lg mb-4">Aucune ville trouvée.</p>
              <Link to="/commercants/rejoindre" className="text-bleu font-semibold hover:text-or transition-colors underline underline-offset-4" onClick={() => setIsOpen(false)}>
                Demandez le lancement dans votre ville
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
