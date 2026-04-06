import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Building2 } from 'lucide-react';
import { rechercherVille } from '../lib/adresse-gouv';

/**
 * Champ de recherche de ville avec autocomplétion via l'API du gouvernement.
 * Affiche TOUTES les communes de France. Peut indiquer le statut Réseaux-Résident si fourni.
 *
 * @param {object} props
 * @param {string} props.value - Nom de ville affiché
 * @param {function} props.onChange - Quand l'utilisateur tape (string)
 * @param {function} props.onSelect - Quand une ville est choisie ({nom, codePostal, departement, region, ...})
 * @param {Array} props.villesPartenaires - Villes déjà dans Supabase (pour afficher le badge "Actif"/"Bientôt")
 * @param {string} props.placeholder
 * @param {boolean} props.required
 * @param {string} props.id
 * @param {string} props.label
 */
export default function AutocompleteVille({ value, onChange, onSelect, villesPartenaires = [], placeholder, required, id, label }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await rechercherVille(value, { limit: 8 });

      // Enrichir avec le statut partenaire si la ville existe dans Supabase
      const enriched = results.map((r) => {
        const match = villesPartenaires.find(
          (v) => v.nom.toLowerCase() === r.nom.toLowerCase()
        );
        return {
          ...r,
          statut: match?.statut || null,
          slug: match?.slug || null,
        };
      });

      setSuggestions(enriched);
      setIsOpen(enriched.length > 0);
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [value, villesPartenaires]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(suggestion) {
    onSelect?.(suggestion);
    onChange?.(suggestion.nom);
    setIsOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-gray-700 mb-2">{label}{required && ' *'}</label>
      )}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder || 'Tapez le nom de votre ville...'}
          required={required}
          autoComplete="off"
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-or focus:ring-2 focus:ring-or/20 outline-none transition-all text-base bg-white"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-or border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-72 overflow-y-auto" role="listbox">
          {suggestions.map((s, i) => (
            <li key={i} role="option">
              <button
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 border-b border-gray-50 last:border-0"
                onClick={() => handleSelect(s)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 size={16} className="text-bleu shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="font-semibold text-texte text-sm truncate">{s.nom}</div>
                    <div className="text-xs text-gray-400 truncate">{s.codePostal} · {s.departement}{s.region ? `, ${s.region}` : ''}</div>
                  </div>
                </div>
                {s.statut && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full shrink-0 ${
                    s.statut === 'actif' ? 'bg-green-100 text-vert' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {s.statut === 'actif' ? 'Actif' : 'Bientôt'}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
