// src/pages/villes/EvenementsVille.jsx
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowLeft, Users, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import usePageMeta from '../../hooks/usePageMeta';

const CATEGORIES = ['Tous', 'Culture', 'Sport', 'Marché', 'Fête', 'Conférence', 'Solidarité', 'Autre'];

export default function EvenementsVille() {
  const { slug } = useParams();
  usePageMeta('Événements');

  const [ville, setVille] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [filtre, setFiltre] = useState('Tous');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function charger() {
      try {
        const { data: v } = await supabase.from('villes').select('id, nom, slug').eq('slug', slug).maybeSingle();
        if (!v) { setIsLoading(false); return; }
        setVille(v);

        const { data: evts } = await supabase.from('evenements')
          .select('id, titre, description, lieu, date_debut, date_fin, categorie, gratuit, prix, image_url, statut, capacite, type_acces, inscrits_count')
          .eq('ville_id', v.id).eq('statut', 'publie')
          .gte('date_debut', new Date().toISOString())
          .order('date_debut');
        setEvenements(evts ?? []);
      } catch (err) {
        console.error('Erreur EvenementsVille:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [slug]);

  const filtered = filtre === 'Tous' ? evenements : evenements.filter((e) => e.categorie === filtre);

  if (isLoading) return <div className="min-h-screen pt-32 bg-creme flex items-center justify-center"><div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" /></div>;
  if (!ville) return <div className="min-h-screen pt-32 bg-creme flex items-center justify-center"><p className="text-gray-500">Ville introuvable.</p></div>;

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-5xl mx-auto px-4">
        <Link to={`/villes/${slug}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-bleu transition-colors mb-6">
          <ArrowLeft size={16} /> Retour à {ville.nom}
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-serif text-3xl font-bold text-texte mb-2">Événements à {ville.nom}</h1>
          <p className="text-gray-500 mb-8">{evenements.length} événement{evenements.length !== 1 ? 's' : ''} à venir</p>
        </motion.div>

        {/* Filtres */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setFiltre(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filtre === cat ? 'bg-bleu text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-bleu/30'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Aucun événement à venir dans cette catégorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((evt, i) => {
              const d = new Date(evt.date_debut);
              const jour = d.getDate();
              const mois = d.toLocaleDateString('fr-FR', { month: 'short' });
              const complet = evt.capacite && evt.inscrits_count >= evt.capacite;

              return (
                <motion.div key={evt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/villes/${slug}/evenements/${evt.id}`}
                    className="block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-bleu/20 transition-all">
                    {evt.image_url && (
                      <img loading="lazy" decoding="async" src={evt.image_url} alt={evt.titre} className="w-full h-40 object-cover" />
                    )}
                    <div className="p-5">
                      <div className="flex gap-4">
                        <div className="text-center shrink-0">
                          <div className="text-2xl font-bold text-bleu">{jour}</div>
                          <div className="text-xs text-gray-500 uppercase">{mois}</div>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-texte mb-1 truncate">{evt.titre}</h3>
                          {evt.lieu && <p className="text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin size={12} />{evt.lieu}</p>}
                          <div className="flex flex-wrap gap-2">
                            {evt.categorie && <span className="px-2 py-0.5 bg-bleu/10 text-bleu text-[10px] font-bold rounded-full">{evt.categorie}</span>}
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${evt.gratuit ? 'bg-green-100 text-vert' : 'bg-or/10 text-or'}`}>
                              {evt.gratuit ? 'Gratuit' : `${evt.prix ?? ''}€`}
                            </span>
                            {complet && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">Complet</span>}
                            {evt.capacite && !complet && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full flex items-center gap-1">
                                <Users size={10} /> {evt.capacite - (evt.inscrits_count || 0)} places
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
