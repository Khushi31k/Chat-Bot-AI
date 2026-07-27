import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'wouter';
import { ArrowRight, BookOpen, CheckSquare, Brain, Wind, MessageSquare, Sparkles } from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'Journal',
    subtitle: 'Your private canvas',
    description: 'A premium notebook experience with mood tracking, AI summaries, and a beautiful writing environment that adapts to you.',
    accent: '#818cf8',
  },
  {
    icon: CheckSquare,
    title: 'Habits',
    subtitle: 'Small steps, every day',
    description: 'Build streaks, visualize progress with heatmaps, and celebrate consistency. ELLA notices when you need encouragement.',
    accent: '#a78bfa',
  },
  {
    icon: Brain,
    title: 'Memory',
    subtitle: 'She remembers you',
    description: 'Tell ELLA what matters — your preferences, goals, context — and she weaves it into every conversation.',
    accent: '#c4b5fd',
  },
  {
    icon: Wind,
    title: 'Meditation',
    subtitle: 'Breathe with intention',
    description: 'Personalised guided meditations, breathing exercises, and ambient sessions generated just for your mood.',
    accent: '#93c5fd',
  },
  {
    icon: MessageSquare,
    title: 'Chat',
    subtitle: 'A companion who listens',
    description: 'Stream-powered conversations with full context awareness. ELLA is always there, always thoughtful.',
    accent: '#6ee7b7',
  },
];

function FeatureSection({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: isEven ? -40 : 40 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
      className={`flex flex-col md:flex-row items-center gap-12 py-20 border-b border-white/5 ${!isEven ? 'md:flex-row-reverse' : ''}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${feature.accent}20`, color: feature.accent }}>
            <feature.icon size={20} />
          </div>
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: feature.accent }}>{feature.subtitle}</span>
        </div>
        <h3 className="font-serif text-4xl md:text-5xl text-white mb-4">{feature.title}</h3>
        <p className="text-lg text-white/50 leading-relaxed max-w-md">{feature.description}</p>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="relative w-72 h-72 md:w-80 md:h-80">
          <div
            className="absolute inset-0 rounded-3xl opacity-10 blur-2xl"
            style={{ backgroundColor: feature.accent }}
          />
          <div className="glass-card rounded-3xl w-full h-full flex items-center justify-center relative overflow-hidden border border-white/5">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-3xl"
              style={{ background: `radial-gradient(circle at 50% 50%, ${feature.accent}15, transparent 70%)` }}
            />
            <feature.icon size={56} style={{ color: feature.accent, opacity: 0.6 }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const featuresRef = useRef(null);

  return (
    <div className="min-h-[100dvh] w-full bg-[#0d0d0f] text-white overflow-x-hidden">

      {/* Glass Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav px-6 md:px-12 h-16 flex items-center justify-between">
        <span className="font-serif text-2xl tracking-widest">ELLA</span>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
        </div>
        <Link href="/login">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2 rounded-full border border-white/10 transition-colors"
          >
            Sign In
          </motion.button>
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-16">

        {/* Animated Orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <motion.div
            className="w-[600px] h-[600px] md:w-[900px] md:h-[900px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(129,140,248,0.15) 0%, rgba(167,139,250,0.08) 40%, transparent 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Floating Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-indigo-400/30"
            style={{
              left: `${10 + (i * 4.2) % 80}%`,
              top: `${15 + (i * 7.3) % 70}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i * 0.3) % 3,
            }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 mb-8 font-medium tracking-wide"
          >
            <Sparkles size={12} className="text-indigo-400" />
            Your AI-powered personal companion
          </motion.div>

          <h1 className="font-serif text-7xl md:text-9xl tracking-widest mb-6 text-white leading-none">
            ELLA
          </h1>

          <p className="text-xl md:text-2xl text-white/40 max-w-lg mx-auto leading-relaxed mb-12 font-light">
            An AI companion that journals, remembers, plans, and grows with you.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(129,140,248,0.4)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-indigo-500 text-white font-medium px-8 py-4 rounded-full text-base flex items-center gap-2 shadow-[0_0_25px_rgba(129,140,248,0.3)] transition-shadow"
              >
                Begin your journey <ArrowRight size={18} />
              </motion.button>
            </Link>
            <a href="#features">
              <button className="text-white/40 hover:text-white/70 font-medium px-6 py-4 rounded-full text-base transition-colors">
                Learn more
              </button>
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-px h-12 bg-gradient-to-b from-transparent to-white/20" />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="max-w-5xl mx-auto px-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20 pt-20"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">Everything you need to flourish</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Built around you. Every feature designed to help you live with more clarity and intention.</p>
        </motion.div>

        {features.map((feature, i) => (
          <FeatureSection key={feature.title} feature={feature} index={i} />
        ))}
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="border-t border-white/5 py-32 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center mx-auto mb-8">
            <Brain size={28} className="text-indigo-400" />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-6">Privacy by design</h2>
          <p className="text-white/40 text-lg leading-relaxed mb-12">
            Your journal entries, habits, memories and conversations are yours alone. We believe your inner life deserves the same protection as your home.
          </p>
          <Link href="/login">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium px-8 py-4 rounded-full text-base transition-colors"
            >
              Get started — it's free
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6 text-center">
        <p className="text-white/20 text-sm font-serif tracking-widest">ELLA &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
