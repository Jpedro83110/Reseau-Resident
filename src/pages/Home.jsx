import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Coffee, Percent, Gift, Store, CreditCard, MapPin } from 'lucide-react';
import { CarteVisuelle, SearchVille, VilleCard, TarifsSection, StatsWidget, CartesCadeaux } from '../components/index.jsx';
import { useVilles } from '../hooks/useData';

const AVANTAGES = [
  { icon: <Coffee size={24} aria-hidden="true" />, titre: 'Café ou dessert offert', desc: 'Chez les restaurateurs et cafés partenaires de votre ville.' },
  { icon: <Percent size={24} aria-hidden="true" />, titre: 'Remises exclusives', desc: 'De 5% à 15% de réduction chez vos commerçants de quartier.' },
  { icon: <Gift size={24} aria-hidden="true" />, titre: 'Cadeaux de bienvenue', desc: 'Des attentions particulières lors de votre première visite.' },
  { icon: <Store size={24} aria-hidden="true" />, titre: 'Offres hors-saison', desc: 'Des avantages renforcés pour soutenir l\'économie locale l\'hiver.' },
  { icon: <CreditCard size={24} aria-hidden="true" />, titre: 'Cartes cadeaux', desc: 'Offrez le choix parmi tous les commerces de votre ville.' },
  { icon: <MapPin size={24} aria-hidden="true" />, titre: 'Ville vivante', desc: 'En consommant local, vous participez au dynamisme de votre quartier.' },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Home() {
  const { data: villes, loading } = useVilles();

  return (
    <div className="overflow-hidden">

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 bg-gradient-to-br from-[#0d2440] to-bleu text-white overflow-hidden">
        {/* Orbe décoratif */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-or/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Texte */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-blue-100">
                <span className="w-2 h-2 rounded-full bg-or animate-pulse" />
                Initiative locale · Var, France
              </motion.div>

              <motion.h1 variants={fadeUp} className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
                Votre ville mérite votre{' '}
                <em className="text-or-clair not-italic">fidélité</em>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-xl text-blue-100 mb-10 max-w-lg leading-relaxed">
                La Carte Résident vous donne accès à des avantages exclusifs chez les commerces de votre quartier. Pas d'application. Juste une carte dans votre portefeuille.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#recherche"
                  onClick={(e) => { e.preventDefault(); document.getElementById('recherche')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex justify-center items-center px-8 py-4 text-lg font-bold rounded-xl text-white bg-or hover:bg-or-clair transition-colors shadow-lg"
                >
                  Trouver ma ville
                </a>
                <a
                  href="#comment-ca-marche"
                  onClick={(e) => { e.preventDefault(); document.getElementById('comment-ca-marche')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex justify-center items-center px-8 py-4 text-lg font-bold rounded-xl text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
                >
                  Comment ça marche
                </a>
              </motion.div>
            </motion.div>

            {/* Carte visuelle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3, type: 'spring' }}
              className="lg:ml-auto"
            >
              <CarteVisuelle />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── RECHERCHE DE VILLE ───────────────────────── */}
      <section id="recherche" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-or mb-3">Disponibilité</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6">
              Votre ville est-elle déjà partenaire ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Recherchez votre commune pour découvrir les avantages disponibles près de chez vous.
            </p>
          </div>

          <div className="mb-16">
            <SearchVille />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {(villes ?? []).filter(v => v.statut === 'actif').length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {(villes ?? []).filter(v => v.statut === 'actif').map((ville) => (
                    <VilleCard key={ville.id} ville={ville} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">Aucune ville active pour le moment. La première ville sera activée dès qu'un commerce partenaire sera validé.</p>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ───────────────────────── */}
      <section id="comment-ca-marche" className="py-24 bg-gris-clair">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6">Simple comme bonjour</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
              Pas d'application. Pas de smartphone obligatoire. Une vraie carte physique dans votre portefeuille.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: '1', title: "J'obtiens ma carte", desc: 'Commandez en ligne, par téléphone ou chez un commerçant partenaire. Reçue par courrier sous 5 jours.' },
              { num: '2', title: 'Je la glisse dans mon portefeuille', desc: 'Une carte physique élégante, format carte bancaire. Toujours à portée de main.' },
              { num: '3', title: 'Je la présente', desc: 'Montrez simplement votre carte lors de votre passage en caisse. Aucun scan obligatoire.' },
              { num: '4', title: 'Je découvre des commerces', desc: 'Profitez d\'avantages exclusifs et soutenez l\'économie locale toute l\'année.' },
            ].map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative pt-12">
                <div className="w-12 h-12 rounded-full bg-or text-white flex items-center justify-center font-serif text-2xl font-bold absolute -top-6 left-8 shadow-lg">
                  {step.num}
                </div>
                <h3 className="font-serif text-xl font-bold text-texte mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AVANTAGES ───────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6">Des avantages toute l'année</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Votre fidélité récompensée chez les artisans et commerçants de votre quartier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {AVANTAGES.map((av, i) => (
              <div key={i} className="flex gap-4 p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-or/40 transition-colors group">
                <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center text-or shrink-0 group-hover:scale-110 transition-transform">
                  {av.icon}
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-texte mb-2">{av.titre}</h3>
                  <p className="text-gray-600 leading-relaxed">{av.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TARIFS ──────────────────────────────────── */}
      <TarifsSection />

      {/* ── COMMERÇANTS ─────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-sm font-bold text-vert uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-vert" />
                100% gratuit pour les commerçants
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-bold text-texte mb-6 leading-tight">
                Vous êtes commerçant ?<br />Rejoignez le mouvement.
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Attirez une clientèle locale fidèle, augmentez votre fréquentation hors-saison et participez au dynamisme de votre ville sans aucun frais.
              </p>
              <Link to="/commercants" className="inline-flex items-center gap-2 text-lg font-bold text-bleu hover:text-or transition-colors group">
                Découvrir l'espace commerçant
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center min-h-[140px]">
                <div className="font-serif text-4xl font-bold text-bleu mb-2">0€</div>
                <div className="text-gray-600 font-medium uppercase tracking-wider text-xs">Frais d'adhésion</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center min-h-[140px]">
                <div className="font-serif text-4xl font-bold text-or mb-2">Illimité</div>
                <div className="text-gray-600 font-medium uppercase tracking-wider text-xs">Avantages toute l'année</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center min-h-[140px]">
                <div className="font-serif text-3xl font-bold text-vert mb-2">Libre</div>
                <div className="text-gray-600 font-medium uppercase tracking-wider text-xs">Sans engagement</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARTES CADEAUX ──────────────────────────── */}
      <CartesCadeaux />

      {/* ── CTA FINAL ───────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-bleu to-[#0d2440] text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">Prêt à soutenir votre ville ?</h2>
          <p className="text-xl text-blue-200 mb-10">10€ par an. Une carte dans votre portefeuille. Des avantages dès le premier jour.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#recherche"
              onClick={(e) => { e.preventDefault(); document.getElementById('recherche')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex justify-center items-center px-8 py-4 text-lg font-bold rounded-xl text-white bg-or hover:bg-or-clair transition-colors shadow-lg"
            >
              Obtenir ma carte
            </a>
            <Link to="/commercants/rejoindre" className="inline-flex justify-center items-center px-8 py-4 text-lg font-bold rounded-xl text-white border-2 border-white/30 hover:bg-white/10 transition-colors">
              Je suis commerçant
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
