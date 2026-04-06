import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Euro, Heart, ShieldCheck, Megaphone } from 'lucide-react';
import { useState } from 'react';
import usePageMeta from '../../hooks/usePageMeta';

const AVANTAGES = [
  { icon: <Users size={30} aria-hidden="true" />, titre: 'Nouvelle clientèle', desc: 'Attirez les résidents de votre ville qui privilégient les commerces partenaires.' },
  { icon: <TrendingUp size={30} aria-hidden="true" />, titre: 'Boost hors-saison', desc: 'Maintenez votre activité toute l\'année grâce à une clientèle locale fidèle.' },
  { icon: <Euro size={30} aria-hidden="true" />, titre: '100% Gratuit', desc: 'Aucun frais d\'adhésion, aucun abonnement. Vous ne payez rien.' },
  { icon: <Heart size={30} aria-hidden="true" />, titre: 'Image positive', desc: 'Associez votre commerce à une initiative locale solidaire et appréciée.' },
  { icon: <ShieldCheck size={30} aria-hidden="true" />, titre: 'Sans engagement', desc: 'Libre de modifier votre avantage ou de quitter le réseau à tout moment.' },
  { icon: <Megaphone size={30} aria-hidden="true" />, titre: 'Visibilité accrue', desc: 'Votre commerce est mis en avant sur notre plateforme et nos supports.' },
];

const FAQ = [
  { q: 'Est-ce vraiment gratuit ?', r: 'Oui, totalement. Aucun frais d\'adhésion, aucune commission, aucun abonnement. Vous choisissez librement l\'avantage que vous offrez.' },
  { q: 'Comment les résidents prouvent-ils qu\'ils ont la carte ?', r: 'Ils vous présentent simplement leur carte physique lors du passage en caisse. C\'est tout. Pas d\'application, pas de scan obligatoire.' },
  { q: 'Puis-je changer l\'avantage que j\'offre ?', r: 'Oui, à tout moment sur simple demande. Vous êtes libre de modifier votre offre ou de la suspendre temporairement.' },
  { q: 'Comment rejoindre le réseau ?', r: 'Remplissez le formulaire ci-dessous en 2 minutes. Notre équipe valide votre profil sous 48h et vous envoie votre kit de communication.' },
];

function FaqItem({ q, r }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        className="w-full text-left py-5 flex justify-between items-center gap-4 font-serif text-lg font-bold text-texte hover:text-bleu transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {q}
        <span className={`text-2xl leading-none transition-transform ${open ? 'rotate-45' : ''}`} aria-hidden="true">+</span>
      </button>
      {open && <p className="pb-5 text-gray-600 leading-relaxed">{r}</p>}
    </div>
  );
}

export default function Commercants() {
  usePageMeta('Commerces partenaires', 'Trouvez les commerces partenaires de votre ville et profitez de réductions exclusives.');

  return (
    <div className="min-h-screen bg-creme">

      {/* Hero */}
      <section className="relative pt-32 pb-24 bg-gradient-to-br from-bleu to-[#0d2440] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_bottom_left,_#c8963e_0%,_transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 text-sm font-bold text-green-300 uppercase tracking-wider mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Réseau de commerçants locaux
            </div>
            <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Rejoignez le réseau<br />
              <em className="text-or-clair not-italic">Gratuit et sans engagement</em>
            </h1>
            <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Devenez partenaire de la Réseaux-Résident et dynamisez votre commerce en récompensant la fidélité des habitants de votre ville.
            </p>
            <Link
              to="/commercants/rejoindre"
              className="inline-flex justify-center items-center px-8 py-4 text-lg font-bold rounded-xl text-bleu bg-white hover:bg-gray-50 transition-colors shadow-xl"
            >
              Inscrire mon commerce →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6">Ce que vous y gagnez</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Un partenariat gagnant-gagnant conçu pour soutenir le commerce de proximité.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {AVANTAGES.map((av, i) => (
              <div key={i} className="bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:border-or/40 transition-colors group">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-or mb-6 group-hover:scale-110 transition-transform">
                  {av.icon}
                </div>
                <h3 className="font-serif text-2xl font-bold text-texte mb-3">{av.titre}</h3>
                <p className="text-gray-600 leading-relaxed">{av.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-24 bg-gris-clair">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6">Comment ça fonctionne ?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">3 étapes ultra-simples pour rejoindre le réseau.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '1', title: 'Inscription en 2 min', desc: 'Remplissez le formulaire en ligne avec vos coordonnées et l\'avantage que vous souhaitez offrir.' },
              { num: '2', title: 'Validation rapide', desc: 'Notre équipe valide votre profil sous 48h et vous envoie votre kit de communication.' },
              { num: '3', title: 'Accueillez vos clients', desc: 'Les résidents présentent leur carte lors du passage en caisse. Vous accordez l\'avantage. C\'est tout.' },
            ].map((step, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-bleu text-white flex items-center justify-center font-serif text-3xl font-bold mx-auto mb-6 shadow-lg">
                  {step.num}
                </div>
                <h3 className="font-serif text-2xl font-bold text-texte mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold text-texte mb-4">Questions fréquentes</h2>
          </div>
          <div className="bg-gris-clair rounded-3xl p-8">
            {FAQ.map((item, i) => <FaqItem key={i} q={item.q} r={item.r} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-or text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">Prêt à dynamiser votre commerce ?</h2>
          <p className="text-xl text-orange-50 mb-10 max-w-2xl mx-auto">L'inscription prend moins de 2 minutes et est totalement gratuite.</p>
          <Link
            to="/commercants/rejoindre"
            className="inline-flex justify-center items-center px-8 py-4 text-lg font-bold rounded-xl text-or bg-white hover:bg-gray-50 transition-colors shadow-xl"
          >
            Inscrire mon commerce
          </Link>
        </div>
      </section>
    </div>
  );
}
