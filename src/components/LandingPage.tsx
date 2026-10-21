/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Fragment, useRef, type ReactNode, type RefObject } from 'react';
import {
  motion, MotionConfig, useReducedMotion, useScroll, useTransform, type Variants,
} from 'motion/react';
import { Play, Crosshair, Navigation, Dna, ChevronDown, ExternalLink, Smartphone, Keyboard, Shield, Brain, TrendingUp, FlaskConical } from 'lucide-react';
import { CODEX, CELL_TYPES, ANTIBODY_CLASSES, codexArtUrl, cellArtUrl } from '../engine';
import AttractScene from './AttractScene';
import OrganismArt from './OrganismArt';

interface Props {
  onPlay: () => void;
}

/** Shared easing and springs (Motion.dev guidance: springs for gestures, ease-out for entrances). */
const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: 'spring', stiffness: 300, damping: 20 } as const;

const REPO = 'https://github.com/CptNope/Cytoscape-Immune-Defense';
const TITLE = 'CYTOSCAPE';

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Fades and lifts its children in as they scroll into view. */
function Reveal({ children, root, className = '', stagger = false }: {
  children: ReactNode; root: RefObject<HTMLDivElement | null>; className?: string; stagger?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger ? container : item}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2, root }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <motion.div variants={item} className="max-w-2xl space-y-3">
      <p className="font-mono text-xs sm:text-sm tracking-[0.2em] uppercase text-emerald-400">{kicker}</p>
      <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.02]">{title}</h2>
      {children && <p className="text-base sm:text-lg text-white/70 leading-relaxed">{children}</p>}
    </motion.div>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -6 }}
      transition={SPRING}
      className={`rounded-2xl border border-white/10 bg-[#120808]/80 backdrop-blur-sm p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function PlayButton({ onPlay, label, big = false }: { onPlay: () => void; label: string; big?: boolean }) {
  return (
    <motion.button
      onClick={onPlay}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRING}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-emerald-400 text-[#04130d] font-extrabold shadow-[0_0_40px_rgba(52,211,153,0.35)] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/60 ${
        big ? 'min-h-14 px-8 text-lg' : 'min-h-11 px-5 text-sm'
      }`}
    >
      <Play className={big ? 'w-5 h-5 fill-current' : 'w-4 h-4 fill-current'} />
      {label}
    </motion.button>
  );
}

const STEPS = [
  { icon: Navigation, title: 'Patrol the bloodstream', body: 'Steer your immune cell through the plasma. Pathogens drift in, split when hit and keep coming in waves.' },
  { icon: Crosshair, title: 'Fire antibodies', body: 'Lock on and shoot. Switch between four real antibody classes, each strong against different invaders.' },
  { icon: Dna, title: 'Adapt and evolve', body: 'Draft mutations between waves, build immune memory and upgrade your cell — while the pathogens evolve right back.' },
];

const GROWTH = [
  { icon: FlaskConical, title: 'Clonal selection', body: 'After each wave, pick one of three mutations: faster fire, side shots, piercing antibodies, NK escorts and more.' },
  { icon: Brain, title: 'Immune memory', body: 'Every kill teaches your immune system. Beat a pathogen type often enough and you deal permanent bonus damage to it, just like a vaccine.' },
  { icon: TrendingUp, title: 'Upgrades and cytokines', body: 'Spend XP on antibody potency, rapid response and hull integrity, and equip cytokines like Fever, Chain Reaction and Interferon.' },
  { icon: Shield, title: 'Adaptive resistance', body: 'Pathogens evolve to match your strength, so every run stays a fight. Bosses scale too. Zen mode never does.' },
];

export default function LandingPage({ onPlay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll({ container: scrollRef });
  // The living background drifts up and dims as you read further
  const sceneY = useTransform(scrollY, [0, 1400], [0, -90]);
  const sceneOpacity = useTransform(scrollY, [0, 700], [1, 0.45]);
  const heroY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 450], [1, 0]);

  const pathogens = CODEX.filter(e => e.kind === 'pathogen');
  const bosses = CODEX.filter(e => e.kind === 'boss');
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 bg-[#0a0505] text-white">
        {/* Living background: the real game renderer, playing itself */}
        <motion.div className="absolute inset-0" style={reduce ? undefined : { y: sceneY, opacity: sceneOpacity }}>
          <AttractScene />
        </motion.div>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(10,5,5,0.15)_0%,rgba(10,5,5,0.7)_70%,rgba(10,5,5,0.92)_100%)]" />

        <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {/* Top bar */}
          <header className="sticky top-0 z-20 backdrop-blur-md bg-[#0a0505]/55 border-b border-white/5">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
              <button onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })} className="flex items-center gap-2.5">
                <img src={cellArtUrl('killer_t', '#ffffff')} alt="" width={30} height={30} />
                <span className="font-black italic uppercase tracking-tighter text-lg">Cytoscape</span>
              </button>
              <nav className="flex items-center gap-1 sm:gap-5 text-sm">
                <button onClick={() => scrollTo('how')} className="hidden sm:inline text-white/70 hover:text-white">How to play</button>
                <button onClick={() => scrollTo('pathogens')} className="hidden sm:inline text-white/70 hover:text-white">Pathogens</button>
                <button onClick={() => scrollTo('cells')} className="hidden md:inline text-white/70 hover:text-white">Your cells</button>
                <PlayButton onPlay={onPlay} label="Play" />
              </nav>
            </div>
          </header>

          {/* Hero */}
          <motion.section
            style={reduce ? undefined : { y: heroY, opacity: heroOpacity }}
            className="relative min-h-[calc(100dvh-60px)] flex flex-col items-center justify-center text-center px-4 pb-16"
          >
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="font-mono text-xs sm:text-sm tracking-[0.3em] uppercase text-emerald-400 mb-4"
            >
              Immune Defense Protocol
            </motion.p>
            <h1 aria-label={TITLE} className="font-black italic uppercase tracking-tighter leading-[0.85] text-[clamp(3.4rem,15vw,10rem)] flex">
              {TITLE.split('').map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden="true"
                  initial={{ opacity: 0, y: 40, rotate: -6 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ ...SPRING, delay: 0.15 + i * 0.05 }}
                  className="inline-block"
                >
                  {ch}
                </motion.span>
              ))}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
              className="mt-6 max-w-xl text-lg sm:text-2xl text-white/80 leading-snug"
            >
              You are a T-cell in the bloodstream. Hunt viruses, bacteria, parasites and fungi before they overrun the host.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.85 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <PlayButton onPlay={onPlay} label="Start defending" big />
              <motion.button
                onClick={() => scrollTo('how')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                className="min-h-14 px-6 rounded-full border border-white/25 text-white font-semibold hover:border-white/50"
              >
                How it works
              </motion.button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="mt-6 font-mono text-xs text-white/55"
            >
              Free · Installable app · Works offline · v{__APP_VERSION__}
            </motion.p>
            <motion.button
              onClick={() => scrollTo('how')}
              aria-label="Scroll to how it works"
              initial={{ opacity: 0 }}
              animate={reduce ? { opacity: 0.6 } : { opacity: 0.6, y: [0, 8, 0] }}
              transition={{ opacity: { delay: 1.4 }, y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }}
              className="absolute bottom-6 p-2"
            >
              <ChevronDown className="w-6 h-6" />
            </motion.button>
          </motion.section>

          <main className="relative max-w-6xl mx-auto px-4 sm:px-6 space-y-28 sm:space-y-36 pb-24">
            {/* How to play */}
            <section id="how" className="scroll-mt-20">
              <Reveal root={scrollRef} stagger className="space-y-10">
                <SectionTitle kicker="How it works" title="You are the immune system.">
                  An Asteroids-style arcade game set inside the body. Every enemy, cell and weapon is based on real immunology.
                </SectionTitle>
                <div className="grid gap-4 md:grid-cols-3">
                  {STEPS.map((s, i) => (
                    <Fragment key={s.title}><Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="grid place-items-center w-10 h-10 rounded-full bg-emerald-400/15 text-emerald-300 font-mono text-sm">{i + 1}</span>
                        <s.icon className="w-5 h-5 text-emerald-300" />
                      </div>
                      <h3 className="text-xl font-bold mb-1.5">{s.title}</h3>
                      <p className="text-white/70 leading-relaxed">{s.body}</p>
                    </Card></Fragment>
                  ))}
                </div>
              </Reveal>
            </section>

            {/* Pathogens */}
            <section id="pathogens" className="scroll-mt-20">
              <Reveal root={scrollRef} stagger className="space-y-10">
                <SectionTitle kicker="Know the enemy" title="Every pathogen fights differently.">
                  Hit one and it splits, Asteroids-style. Each type has its own behaviour, resistances and a counter.
                </SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {pathogens.map((e, i) => (
                    <Fragment key={e.id}><Card className="flex flex-col gap-3">
                      <OrganismArt src={codexArtUrl(e.key, e.color)} size={72} delay={i * 0.05} />
                      <h3 className="text-xl font-extrabold" style={{ color: e.color }}>{e.name}</h3>
                      <p className="text-sm text-white/75 leading-relaxed">{e.inGame}</p>
                      <p className="text-xs text-emerald-300/90 leading-relaxed mt-auto pt-3 border-t border-white/10">{e.tip}</p>
                    </Card></Fragment>
                  ))}
                </div>
              </Reveal>
            </section>

            {/* Antibodies */}
            <section className="scroll-mt-20">
              <Reveal root={scrollRef} stagger className="space-y-10">
                <SectionTitle kicker="Your arsenal" title="Four antibody classes.">
                  Real antibodies come in classes with different shapes and jobs. Swap between them mid-fight to hit each pathogen where it's weak.
                </SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {ANTIBODY_CLASSES.map(c => (
                    <Fragment key={c.id}><Card>
                      <div className="flex items-baseline justify-between mb-2">
                        <h3 className="text-2xl font-black font-mono" style={{ color: c.color }}>{c.name}</h3>
                        <span className="text-[11px] uppercase tracking-wider text-white/50">Level {c.unlockPlayerLevel}</span>
                      </div>
                      <p className="text-sm text-white/75 leading-relaxed">{c.description}</p>
                    </Card></Fragment>
                  ))}
                </div>
              </Reveal>
            </section>

            {/* Cells */}
            <section id="cells" className="scroll-mt-20">
              <Reveal root={scrollRef} stagger className="space-y-10">
                <SectionTitle kicker="Choose your cell" title="Four immune cells, four play styles." />
                <div className="grid gap-4 sm:grid-cols-2">
                  {CELL_TYPES.map((c, i) => (
                    <Fragment key={c.id}><Card className="flex gap-4 items-start">
                      <OrganismArt src={cellArtUrl(c.id, c.color)} size={84} delay={i * 0.08} />
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <h3 className="text-xl font-extrabold" style={{ color: c.color }}>{c.name}</h3>
                          <span className="text-[11px] uppercase tracking-wider text-white/50">{c.role}</span>
                        </div>
                        <p className="text-sm text-white/75 leading-relaxed">{c.description}</p>
                        <p className="text-sm"><span className="font-semibold text-white/90">{c.ability.name}:</span> <span className="text-white/65">{c.ability.description}</span></p>
                      </div>
                    </Card></Fragment>
                  ))}
                </div>
              </Reveal>
            </section>

            {/* Bosses */}
            <section className="scroll-mt-20">
              <Reveal root={scrollRef} stagger className="space-y-10">
                <SectionTitle kicker="Every fifth wave" title="Nine bosses from real biology.">
                  A giant virus, a malaria parasite hiding in red blood cells, a tumour feeding itself new blood vessels, and a T-cell that turned on its own body.
                </SectionTitle>
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                  {bosses.map((e, i) => (
                    <motion.div key={e.id} variants={item} whileHover={{ scale: 1.08 }} transition={SPRING} className="flex flex-col items-center gap-2 text-center">
                      <OrganismArt src={codexArtUrl(e.key, e.color)} size={88} lively delay={i * 0.07} />
                      <span className="text-xs font-bold leading-tight" style={{ color: e.color }}>{e.name}</span>
                    </motion.div>
                  ))}
                </div>
              </Reveal>
            </section>

            {/* Progression */}
            <section className="scroll-mt-20">
              <Reveal root={scrollRef} stagger className="space-y-10">
                <SectionTitle kicker="Grow stronger" title="An immune system that learns." />
                <div className="grid gap-4 sm:grid-cols-2">
                  {GROWTH.map(g => (
                    <Fragment key={g.title}><Card>
                      <g.icon className="w-6 h-6 text-emerald-300 mb-3" />
                      <h3 className="text-xl font-bold mb-1.5">{g.title}</h3>
                      <p className="text-white/70 leading-relaxed">{g.body}</p>
                    </Card></Fragment>
                  ))}
                </div>
              </Reveal>
            </section>

            {/* Controls */}
            <section className="scroll-mt-20">
              <Reveal root={scrollRef} stagger className="space-y-10">
                <SectionTitle kicker="Controls" title="Built for thumbs and keyboards." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <div className="flex items-center gap-2 mb-4 text-white/90"><Keyboard className="w-5 h-5" /><h3 className="font-bold text-lg">Keyboard</h3></div>
                    <dl className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
                      <dt className="text-white/70">Move</dt><dd className="font-mono text-emerald-300">WASD / Arrows</dd>
                      <dt className="text-white/70">Fire</dt><dd className="font-mono text-emerald-300">Space / F</dd>
                      <dt className="text-white/70">Ability</dt><dd className="font-mono text-emerald-300">E / Shift</dd>
                      <dt className="text-white/70">Swap antibody</dt><dd className="font-mono text-emerald-300">Q / Tab</dd>
                      <dt className="text-white/70">Pause</dt><dd className="font-mono text-emerald-300">Esc</dd>
                    </dl>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 mb-4 text-white/90"><Smartphone className="w-5 h-5" /><h3 className="font-bold text-lg">Phone and tablet</h3></div>
                    <dl className="grid grid-cols-[1fr_auto] gap-y-2.5 text-sm">
                      <dt className="text-white/70">Move</dt><dd className="font-mono text-emerald-300">Drag on the left half</dd>
                      <dt className="text-white/70">Fire</dt><dd className="font-mono text-emerald-300">Hold on the right half</dd>
                      <dt className="text-white/70">Ability and swap</dt><dd className="font-mono text-emerald-300">On-screen buttons</dd>
                      <dt className="text-white/70">Pause</dt><dd className="font-mono text-emerald-300">Pause button</dd>
                    </dl>
                  </Card>
                </div>
              </Reveal>
            </section>

            {/* Final call to action */}
            <section>
              <Reveal root={scrollRef} stagger className="flex flex-col items-center text-center gap-6 py-10">
                <motion.h2 variants={item} className="font-black italic uppercase tracking-tighter leading-[0.9] text-[clamp(2.4rem,7vw,5rem)]">
                  The host is counting on you.
                </motion.h2>
                <motion.p variants={item} className="max-w-lg text-white/70">
                  Free to play in your browser. Add it to your home screen to install it as an app and play offline.
                </motion.p>
                <motion.div variants={item}><PlayButton onPlay={onPlay} label="Start your first wave" big /></motion.div>
              </Reveal>
            </section>
          </main>

          <footer className="relative border-t border-white/10 bg-[#0a0505]/80">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-sm text-white/55">
              <span>Cytoscape: Immune Defense · v{__APP_VERSION__} · Open source (Apache-2.0)</span>
              <span className="flex flex-wrap items-center gap-5">
                <a href={REPO} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">GitHub<ExternalLink className="w-3.5 h-3.5" /></a>
                <a href={`${REPO}/blob/main/CHANGELOG.md`} target="_blank" rel="noreferrer" className="hover:text-white">Changelog</a>
                <a href={`${REPO}/blob/main/ROADMAP.md`} target="_blank" rel="noreferrer" className="hover:text-white">Roadmap</a>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}
