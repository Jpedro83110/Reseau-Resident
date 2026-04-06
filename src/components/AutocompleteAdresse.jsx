import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { rechercherAdresse } from '../lib/adresse-gouv';

/**
 * Champ d'adresse avec autocomplétion via l'API du gouvernement.
 * @param {object} props
 * @param {string} props.value - Valeur actuelle
 * @param {function} props.onChange - Callback quand l'utilisateur tape
 * @param {function} props.onSelect - Callback quand un résultat est sélectionné ({label, street, postcode, city, ...})
 * @param {string} props.placeholder
 * @param {boolean} props.required
 * @param {string} props.id
 * @param {string} props.label
 */
export default function AutocompleteAdresse({ value, onChange, onSelect, placeholder, required, id, label }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!value || value.length < 4) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await rechercherAdresse(value, { limit: 5 });
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setLoading(false);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(suggestion) {
    onSelect?.(suggestion);
    onChange?.(suggestion.label);
    setIsOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-gray-700 mb-2">{label}{required && ' *'}</label>
      )}
      <div className="relative">
        <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder || 'Commencez à taper une adresse...'}
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
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-60 overflow-y-auto" role="listbox">
          {suggestions.map((s, i) => (
            <li key={i} role="option">
              <button
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-50 last:border-0"
                onClick={() => handleSelect(s)}
              >
                <MapPin size={16} className="text-or shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="font-medium text-texte text-sm">{s.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.context}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
