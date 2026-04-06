import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { UserPlus, MapPin, Heart, Store, Landmark, BarChart3, Users, ArrowRight, Sparkles, Shield, Zap, TrendingUp, Star, ChevronRight } from 'lucide-react';
import { CarteVisuelle, SearchVille, VilleCard, TarifsSection, CartesCadeaux } from '../components/index.jsx';
import { useVilles } from '../hooks/useData';
import usePageMeta from '../hooks/usePageMeta';

// Animations
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } } };
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.8 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } };

export default function Home() {
  const { data: villes, loading } = useVilles();
  usePageMeta();

  const villesActives = (villes ?? []).filter(v => v.statut === 'actif');
  const totalResidents = villesActives.reduce((s, v) => s + (v.cartes_actives || 0), 0);
  const totalCommerces = villesActives.reduce((s, v) => s + (v.commerces_partenaires || 0), 0);

  return (
    <div className="overflow-hidden">

      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Fond gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-bleu via-[#1a3a5c] to-[#0d2440]" />

        {/* Orbe lumineuse */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-or/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-blue-400/10 blur-[80px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-32 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div variants={stagger} initial="hidden" animate="visible">
              <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-white">
                <Sparkles size={14} className="text-or-clair" />
                Plateforme de vie locale
              </motion.div>

              <motion.h1 variants={fadeUp} className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8">
                <span className="text-white">Votre ville,</span><br />
                <span className="text-or-clair">connectée.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg sm:text-xl text-white/80 mb-10 max-w-lg leading-relaxed">
                Résidents, commerçants, associations et mairie — réunis sur une seule plateforme pour faire vivre votre territoire.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Link to="/inscription-compte"
                  className="group inline-flex justify-center items-center gap-2 px-8 py-4 text-base font-bold rounded-xl text-white bg-or hover:bg-or-clair shadow-lg hover:shadow-xl transition-all duration-300">
                  Créer mon compte gratuit
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#decouvrir" onClick={(e) => { e.preventDefault(); document.getElementById('decouvrir')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex justify-center items-center px-8 py-4 text-base font-bold rounded-xl text-white border-2 border-white/40 hover:bg-white/10 transition-all duration-300">
                  Explorer la plateforme
                </a>
              </motion.div>

              {/* Social proof */}
              <motion.div variants={fadeUp} className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['M', 'S', 'A', 'R'].map((letter, i) => (
                    <div key={i} className="w-9 h-9 rounded-full bg-or text-white border-2 border-bleu flex items-center justify-center text-xs font-bold">
                      {letter}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-white/70">
                  <span className="text-white font-bold">Ville pilote</span> — Sanary-sur-Mer
                </div>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
              className="lg:ml-auto">
              <CarteVisuelle />
            </motion.div>
          </div>
        </div>

        {/* Vague de separation */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto">
            <path d="M0,40 C360,80 720,0 1440,40 L1440,80 L0,80 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ══════════ COMMENT ÇA MARCHE ══════════ */}
      <section id="decouvrir" className="py-24 md:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-20">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bleu/5 text-bleu text-sm font-bold mb-6">
              <Zap size={14} /> Comment ça marche
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-serif text-4xl md:text-5xl font-bold text-texte mb-4">
              Trois étapes,<br className="sm:hidden" /> <span className="text-bleu">zéro friction</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-500 max-w-xl mx-auto">
              Rejoignez le réseau local de votre ville en moins d'une minute.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { num: '01', icon: UserPlus, title: 'Créez votre compte', desc: 'Gratuit, en 30 secondes. Choisissez votre ville et commencez à explorer.', color: 'from-blue-500/10 to-blue-600/5', iconBg: 'bg-bleu/10 text-bleu' },
              { num: '02', icon: MapPin, title: 'Découvrez les offres', desc: 'Commerces, événements, offres exclusives — tout ce qui fait vibrer votre ville.', color: 'from-or/10 to-amber-500/5', iconBg: 'bg-or/10 text-or' },
              { num: '03', icon: Heart, title: 'Participez activement', desc: 'Soutenez des projets locaux, relevez des défis et gagnez des badges.', color: 'from-emerald-500/10 to-green-500/5', iconBg: 'bg-vert/10 text-vert' },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }}
                className={`group relative rounded-3xl p-8 md:p-10 bg-gradient-to-br ${step.color} border border-gray-100/80 hover:shadow-xl hover:-translate-y-2 transition-all duration-500`}>
                <div className="text-6xl font-serif font-bold text-gray-100/60 absolute top-6 right-8 select-none group-hover:text-gray-200/80 transition-colors">{step.num}</div>
                <div className={`w-14 h-14 rounded-2xl ${step.iconBg} flex items-center justify-center mb-6`}>
                  <step.icon size={24} />
                </div>
                <h3 className="font-serif text-xl font-bold text-texte mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section className="py-20 bg-gradient-to-r from-[#0f2847] via-bleu to-[#1a3a5c] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: villesActives.length || 1, suffix: '', label: 'Villes actives' },
              { value: totalCommerces || 0, suffix: '+', label: 'Commerces' },
              { value: totalResidents || 0, suffix: '+', label: 'Résidents' },
              { value: 100, suffix: '%', label: 'Gratuit' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="font-serif text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}{stat.suffix}</div>
                <div className="text-blue-200/70 font-medium text-xs uppercase tracking-[0.2em]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ VILLES ══════════ */}
      <section className="py-24 md:py-32 bg-creme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
            <motion.h2 variants={fadeUp} className="font-serif text-4xl md:text-5xl font-bold text-texte mb-4">Votre ville est-elle partenaire ?</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-500 max-w-xl mx-auto">Recherchez votre commune ou découvrez les villes déjà actives.</motion.p>
          </motion.div>
          <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-14">
            <SearchVille />
          </motion.div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map((i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : (villes ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(villes ?? []).map((ville) => <VilleCard key={ville.id} ville={ville} />)}
            </div>
          ) : (
            <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-200/50">
              <MapPin size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">La première ville sera activée très bientôt.</p>
              <Link to="/mairie/inscription" className="inline-flex items-center gap-2 text-bleu font-bold mt-4 hover:text-or transition-colors">
                Proposer votre commune <ChevronRight size={16} />
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* ══════════ 4 ACTEURS ══════════ */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-20">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-or/10 text-or text-sm font-bold mb-6">
              <Star size={14} /> Un écosystème complet
            </motion.div>
            <motion.h2 variants={fadeUp} className="font-serif text-4xl md:text-5xl font-bold text-texte mb-4">
              Quatre acteurs, <span className="text-bleu">une plateforme</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-gray-500 max-w-2xl mx-auto">
              Réseaux-Résident connecte tous les acteurs de la vie locale dans un écosystème vertueux.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {[
              { icon: Users, title: 'Résidents', desc: 'Carte digitale gratuite, offres exclusives, événements locaux, défis et badges.', link: '/inscription-compte', linkText: 'Créer mon compte', gradient: 'from-blue-500 to-blue-600' },
              { icon: Store, title: 'Commerçants', desc: 'Fiche commerce, offres personnalisées, statistiques de fréquentation. 100% gratuit.', link: '/commercants/rejoindre', linkText: 'Inscrire mon commerce', gradient: 'from-emerald-500 to-emerald-600' },
              { icon: Heart, title: 'Associations', desc: 'Projets avec paliers concrets, annonces, événements. Mobilisez votre communauté.', link: '/associations/rejoindre', linkText: 'Inscrire mon association', gradient: 'from-orange-500 to-orange-600' },
              { icon: Landmark, title: 'Mairies', desc: 'Tableau de bord territorial, statistiques, défis citoyens, export bilans.', link: '/mairie/inscription', linkText: 'Inscrire ma commune', gradient: 'from-violet-500 to-violet-600' },
            ].map((actor, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Link to={actor.link} className="group block rounded-3xl p-8 border border-gray-100 bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 h-full">
                  <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${actor.gradient} flex items-center justify-center text-white shrink-0 shadow-lg`}>
                      <actor.icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-xl font-bold text-texte mb-2 group-hover:text-bleu transition-colors">{actor.title}</h3>
                      <p className="text-gray-500 leading-relaxed mb-4">{actor.desc}</p>
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-bleu group-hover:text-or transition-colors">
                        {actor.linkText} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ TARIFS ══════════ */}
      <TarifsSection />

      {/* ══════════ POURQUOI NOUS ══════════ */}
      <section className="py-24 md:py-32 bg-creme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeUp} className="font-serif text-4xl md:text-5xl font-bold text-texte mb-4">
              Pourquoi <span className="text-or">Réseaux-Résident</span> ?
            </motion.h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Données sécurisées', desc: 'Hébergement en France, chiffrement bout en bout, conformité RGPD.' },
              { icon: Zap, title: 'Simple et rapide', desc: 'Inscription en 30 secondes. Carte digitale instantanée. Zéro paperasse.' },
              { icon: TrendingUp, title: 'Impact mesurable', desc: 'Chaque visite, chaque soutien est compté. Votre engagement a un impact réel.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-bleu/5 text-bleu flex items-center justify-center mx-auto mb-5">
                  <item.icon size={24} />
                </div>
                <h3 className="font-serif text-lg font-bold text-texte mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CARTES CADEAUX ══════════ */}
      <CartesCadeaux />

      {/* ══════════ CTA FINAL ══════════ */}
      <section className="py-24 md:py-32 bg-gradient-to-br from-bleu to-[#0d2440] text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-or/10 blur-[100px] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Prêt à rejoindre<br />
              <span className="text-or-clair">votre communauté ?</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-white/80 mb-10 max-w-lg mx-auto">
              Inscription gratuite. Carte digitale instantanée. Des avantages dès le premier jour.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link to="/inscription-compte"
                className="group inline-flex items-center gap-2 px-10 py-5 text-lg font-bold rounded-xl text-white bg-or hover:bg-or-clair shadow-lg transition-all duration-300">
                Créer mon compte gratuitement
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
