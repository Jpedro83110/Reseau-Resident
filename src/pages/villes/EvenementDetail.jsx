// src/pages/villes/EvenementDetail.jsx
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ArrowLeft, CheckCircle2, Tag, Euro } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import usePageMeta from '../../hooks/usePageMeta';

export default function EvenementDetail() {
  const { slug, eventId } = useParams();
  const { user } = useAuth();
  usePageMeta('Événement');

  const [evt, setEvt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inscrit, setInscrit] = useState(false);
  const [inscribing, setInscribing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function charger() {
      try {
        const { data } = await supabase.from('evenements')
          .select('id, titre, description, lieu, adresse, date_debut, date_fin, categorie, gratuit, prix, image_url, statut, capacite, type_acces, heure_debut, heure_fin, inscrits_count, organisateur_type')
          .eq('id', eventId).maybeSingle();
        if (data) setEvt(data);

        // Vérifier si déjà inscrit
        if (user) {
          const { data: insc } = await supabase.from('inscriptions_evenements')
            .select('id, statut').eq('evenement_id', eventId).eq('user_id', user.id).maybeSingle();
          if (insc && insc.statut === 'confirme') setInscrit(true);
        }
      } catch (err) {
        console.error('Erreur EvenementDetail:', err);
      } finally {
        setIsLoading(false);
      }
    }
    charger();
  }, [eventId, user]);

  async function handleInscription() {
    if (!user) { setError('Connectez-vous pour vous inscrire.'); return; }
    setInscribing(true); setError(null);
    try {
      const { error: insErr } = await supabase.from('inscriptions_evenements').insert({
        evenement_id: eventId,
        user_id: user.id,
        email: user.email,
        prenom: user.user_metadata?.prenom || '',
        nom: user.user_metadata?.nom || '',
      });
      if (insErr) {
        if (insErr.code === '23505') setError('Vous êtes déjà inscrit à cet événement.');
        else setError('Erreur lors de l\'inscription.');
      } else {
        setInscrit(true);
        setSuccess(true);
        if (evt) setEvt({ ...evt, inscrits_count: (evt.inscrits_count || 0) + 1 });
      }
    } catch { setError('Erreur inattendue.'); }
    finally { setInscribing(false); }
  }

  if (isLoading) return <div className="min-h-screen pt-32 bg-creme flex items-center justify-center"><div className="w-8 h-8 border-4 border-bleu border-t-transparent rounded-full animate-spin" /></div>;
  if (!evt) return <div className="min-h-screen pt-32 bg-creme flex items-center justify-center"><p className="text-gray-500">Événement introuvable.</p></div>;

  const dateDebut = new Date(evt.date_debut);
  const complet = evt.capacite && (evt.inscrits_count || 0) >= evt.capacite;
  const placesRestantes = evt.capacite ? evt.capacite - (evt.inscrits_count || 0) : null;

  return (
    <div className="min-h-screen pt-28 pb-24 bg-creme">
      <div className="max-w-3xl mx-auto px-4">
        <Link to={`/villes/${slug}/evenements`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-bleu transition-colors mb-6">
          <ArrowLeft size={16} /> Tous les événements
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Image */}
          {evt.image_url && (
            <img src={evt.image_url} alt={evt.titre} className="w-full h-64 object-cover rounded-2xl mb-6" loading="lazy" decoding="async" />
          )}

          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {evt.categorie && <span className="px-3 py-1 bg-bleu/10 text-bleu text-xs font-bold rounded-full">{evt.categorie}</span>}
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${evt.gratuit ? 'bg-green-100 text-vert' : 'bg-or/10 text-or'}`}>
                {evt.gratuit ? 'Gratuit' : `${evt.prix ?? '—'}€`}
              </span>
              {evt.type_acces === 'inscription' && <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Sur inscription</span>}
            </div>
            <h1 className="font-serif text-3xl font-bold text-texte mb-2">{evt.titre}</h1>
          </div>

          {/* Infos pratiques */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={18} className="text-bleu shrink-0" />
              <span className="text-texte font-medium">
                {dateDebut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {(evt.heure_debut || evt.heure_fin) && (
              <div className="flex items-center gap-3 text-sm">
                <Clock size={18} className="text-bleu shrink-0" />
                <span className="text-gray-600">{evt.heure_debut}{evt.heure_fin ? ` — ${evt.heure_fin}` : ''}</span>
              </div>
            )}
            {evt.lieu && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={18} className="text-bleu shrink-0" />
                <span className="text-gray-600">{evt.lieu}{evt.adresse ? `, ${evt.adresse}` : ''}</span>
              </div>
            )}
            {evt.capacite && (
              <div className="flex items-center gap-3 text-sm">
                <Users size={18} className="text-bleu shrink-0" />
                <span className={complet ? 'text-red-600 font-bold' : 'text-gray-600'}>
                  {complet ? 'Complet' : `${placesRestantes} place${placesRestantes > 1 ? 's' : ''} restante${placesRestantes > 1 ? 's' : ''}`}
                  <span className="text-gray-400 ml-1">/ {evt.capacite}</span>
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {evt.description && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h2 className="font-semibold text-texte mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{evt.description}</p>
            </div>
          )}

          {/* Inscription */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">
                <CheckCircle2 size={18} /> Vous êtes inscrit ! 🎉
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{error}</div>
            )}

            {evt.type_acces === 'inscription' ? (
              inscrit ? (
                <div className="text-center py-4">
                  <CheckCircle2 size={32} className="text-vert mx-auto mb-2" />
                  <p className="font-semibold text-vert">Vous êtes inscrit à cet événement</p>
                </div>
              ) : complet ? (
                <button disabled className="w-full py-3 bg-gray-200 text-gray-500 rounded-xl font-bold cursor-not-allowed">
                  Complet — Plus de places disponibles
                </button>
              ) : user ? (
                <button onClick={handleInscription} disabled={inscribing}
                  className="w-full py-3 bg-bleu text-white rounded-xl font-bold hover:bg-bleu-clair transition-colors disabled:opacity-50">
                  {inscribing ? 'Inscription...' : 'S\'inscrire à cet événement'}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-3">Connectez-vous pour vous inscrire</p>
                  <Link to="/connexion" className="inline-block px-6 py-2.5 bg-bleu text-white rounded-xl font-bold hover:bg-bleu-clair transition-colors">
                    Se connecter
                  </Link>
                </div>
              )
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 font-medium">Accès libre — venez comme vous êtes !</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
