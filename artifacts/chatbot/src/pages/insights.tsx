import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useGetInsights, getGetInsightsQueryKey } from '@workspace/api-client-react';
import { Loader2, Sparkles, TrendingUp, Heart, Target, BookOpen, Lightbulb, Smile } from 'lucide-react';

const ICONS = [Sparkles, TrendingUp, Heart, Target, BookOpen, Lightbulb, Smile];
const ACCENT_COLORS = [
  { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', glow: 'rgba(99,102,241,0.15)' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', glow: 'rgba(168,85,247,0.15)' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', glow: 'rgba(236,72,153,0.15)' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.15)' },
  { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-400', glow: 'rgba(14,165,233,0.15)' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'rgba(245,158,11,0.15)' },
];

function personalizeInsight(text: string): string {
  const lower = text.toLowerCase();
  if (!lower.startsWith('i ') && !lower.startsWith('you ') && !lower.startsWith('it seems') && !lower.startsWith('your ')) {
    return 'I noticed that ' + text.charAt(0).toLowerCase() + text.slice(1);
  }
  return text;
}

export default function Insights() {
  const { user } = useAuth();
  const userId = user?.userId || 0;

  const { data: insights, isLoading, error, refetch } = useGetInsights(
    { userId },
    { query: { queryKey: getGetInsightsQueryKey({ userId }), enabled: !!userId } }
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } }
  } as const;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col min-h-[calc(100dvh-4rem)] md:min-h-[100dvh]">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Sparkles size={18} className="text-indigo-400" />
          </div>
          <span className="text-xs font-medium text-indigo-400 uppercase tracking-widest">AI Insights</span>
        </div>
        <h1 className="font-serif text-5xl text-white mb-3">Your Patterns</h1>
        <p className="text-muted-foreground max-w-md">
          I've been paying attention. Here's what I notice about you.
        </p>
      </motion.div>

      {/* Background decoration */}
      <div className="absolute top-40 right-10 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border border-indigo-400/30"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="text-muted-foreground text-sm">ELLA is reflecting on your journey...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
            <Sparkles size={28} className="text-white/20" />
          </div>
          <h3 className="text-xl text-white mb-2 font-serif">No insights yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm mb-6">
            Use ELLA for a few days — journal, log habits, track your mood — and she'll start noticing patterns.
          </p>
          <button
            onClick={() => refetch()}
            className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-full text-sm font-medium border border-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : !insights?.insights?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
            <Sparkles size={28} className="text-white/20" />
          </div>
          <h3 className="text-xl text-white mb-2 font-serif">Keep exploring</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            ELLA is still learning your patterns. The more you engage, the richer your insights become.
          </p>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10"
        >
          {insights.insights.map((insight: string, i: number) => {
            const Icon = ICONS[i % ICONS.length];
            const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];

            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className={`glass-card rounded-3xl p-6 border ${accent.border} relative overflow-hidden group hover:border-white/10 transition-colors`}
              >
                <div
                  className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{ background: accent.glow, transform: 'translate(30%, -30%)' }}
                />
                <div className={`w-10 h-10 rounded-2xl ${accent.bg} border ${accent.border} flex items-center justify-center mb-4`}>
                  <Icon size={18} className={accent.text} />
                </div>
                <p className="text-white/80 leading-relaxed text-sm md:text-base">{personalizeInsight(insight)}</p>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
