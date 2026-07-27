import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  useListMoodLogs, 
  useListHabits, 
  useListJournalEntries, 
  useListGoals,
  useGetInsights,
  useListMeditationPresets,
  getListMoodLogsQueryKey,
  getListHabitsQueryKey,
  getListJournalEntriesQueryKey,
  getListGoalsQueryKey,
  getGetInsightsQueryKey
} from '@workspace/api-client-react';
import { format, isToday } from 'date-fns';
import { ArrowRight, BookOpen, Target, Activity, Smile, Sparkles, Wind, Check } from 'lucide-react';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.userId || 0;

  const { data: moodLogs } = useListMoodLogs({ userId }, { query: { queryKey: getListMoodLogsQueryKey({ userId }), enabled: !!userId } });
  const { data: habits } = useListHabits({ userId }, { query: { queryKey: getListHabitsQueryKey({ userId }), enabled: !!userId } });
  const { data: journalEntries } = useListJournalEntries({ userId }, { query: { queryKey: getListJournalEntriesQueryKey({ userId }), enabled: !!userId } });
  const { data: goals } = useListGoals({ userId }, { query: { queryKey: getListGoalsQueryKey({ userId }), enabled: !!userId } });
  const { data: insights } = useGetInsights({ userId }, { query: { queryKey: getGetInsightsQueryKey({ userId }), enabled: !!userId } });
  const { data: presets } = useListMeditationPresets();

  const todayMood = moodLogs?.find(log => isToday(new Date(log.date)));
  const recentJournal = journalEntries?.[0];
  const activeGoals = goals?.filter(g => g.progress < 100).slice(0, 2);
  const topInsight = insights?.insights?.[0];
  const todayHabits = habits?.slice(0, 4) || [];
  const recommendedPreset = presets?.[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } }
  } as const;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full pb-16">
      {/* Hero Greeting */}
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-10"
      >
        <h1 className="font-serif text-5xl md:text-6xl text-white mb-2 tracking-wide">
          {getGreeting()},<br />{user?.username}.
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* AI Insight Hero */}
        {topInsight && (
          <motion.div variants={itemVariants}>
            <Link href="/insights">
              <div className="glass-card rounded-3xl p-6 md:p-8 border border-indigo-500/20 relative overflow-hidden cursor-pointer hover:border-indigo-500/30 transition-colors group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Sparkles size={18} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-2">ELLA's Insight</p>
                    <p className="text-white/80 leading-relaxed text-sm md:text-base line-clamp-2">{topInsight}</p>
                  </div>
                  <ArrowRight size={16} className="text-indigo-400/50 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Top row: Mood + Habits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Mood Card */}
          <motion.div variants={itemVariants}>
            <Link href="/mood">
              <div className="glass-card rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group h-full">
                <div className="flex items-center gap-3 mb-5 text-primary">
                  <Smile size={16} />
                  <h3 className="font-medium text-xs tracking-widest uppercase">Today's Mood</h3>
                </div>
                {todayMood ? (
                  <div>
                    <p className="font-serif text-4xl mb-1 capitalize text-white">{todayMood.mood}</p>
                    {todayMood.note && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{todayMood.note}</p>}
                  </div>
                ) : (
                  <div>
                    <p className="text-white/40 text-sm mb-4 font-serif italic">How are you feeling?</p>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full group-hover:bg-primary/20 transition-colors">
                      Log mood <ArrowRight size={12} />
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>

          {/* Today's Habits */}
          <motion.div variants={itemVariants}>
            <Link href="/habits">
              <div className="glass-card rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group h-full">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3 text-primary">
                    <Activity size={16} />
                    <h3 className="font-medium text-xs tracking-widest uppercase">Today's Habits</h3>
                  </div>
                  {habits && habits.length > 0 && (
                    <span className="text-xs text-muted-foreground">{habits.length} active</span>
                  )}
                </div>
                {todayHabits.length > 0 ? (
                  <div className="space-y-2">
                    {todayHabits.map(h => (
                      <div key={h.id} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center">
                          <Check size={10} className="text-white/20" />
                        </div>
                        <span className="text-sm text-white/70 truncate">{h.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/40 text-sm font-serif italic">No habits yet</p>
                )}
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Recent Journal */}
        <motion.div variants={itemVariants}>
          <Link href="/journal">
            <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3 text-primary">
                  <BookOpen size={16} />
                  <h3 className="font-medium text-xs tracking-widest uppercase">Recent Journal Entry</h3>
                </div>
                {recentJournal && (
                  <span className="text-xs text-muted-foreground">{format(new Date(recentJournal.date), 'MMM d')}</span>
                )}
              </div>
              {recentJournal ? (
                <div>
                  <p className="text-white/70 leading-relaxed line-clamp-3 font-serif text-lg">{recentJournal.content}</p>
                </div>
              ) : (
                <div>
                  <p className="text-white/40 text-base font-serif italic mb-4">Your mind is a blank canvas today.</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full group-hover:bg-primary/20 transition-colors">
                    Write an entry <ArrowRight size={12} />
                  </span>
                </div>
              )}
            </div>
          </Link>
        </motion.div>

        {/* Goals + Meditation row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Goals */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <div className="glass-card rounded-3xl p-6 border border-white/5 h-full">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3 text-primary">
                  <Target size={16} />
                  <h3 className="font-medium text-xs tracking-widest uppercase">Upcoming Goals</h3>
                </div>
                <Link href="/goals" className="text-xs text-muted-foreground hover:text-white transition-colors">
                  View all
                </Link>
              </div>
              {activeGoals && activeGoals.length > 0 ? (
                <div className="space-y-4">
                  {activeGoals.map(goal => (
                    <div key={goal.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-white/80 truncate">{goal.title}</span>
                        <span className="text-xs text-muted-foreground ml-3 shrink-0">{goal.progress}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/8 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${goal.progress}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/30 text-sm italic font-serif">No active goals</p>
                  <Link href="/goals" className="inline-flex items-center gap-1.5 text-xs text-primary mt-3 hover:underline">
                    Set a goal <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recommended Meditation */}
          <motion.div variants={itemVariants}>
            <Link href="/meditation">
              <div className="glass-card rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group h-full flex flex-col">
                <div className="flex items-center gap-3 mb-5 text-primary">
                  <Wind size={16} />
                  <h3 className="font-medium text-xs tracking-widest uppercase">Meditation</h3>
                </div>
                {recommendedPreset ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-serif text-xl text-white mb-1">{recommendedPreset.title}</p>
                      <p className="text-xs text-muted-foreground">{recommendedPreset.duration} min · {recommendedPreset.theme}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full group-hover:bg-primary/20 transition-colors mt-4 w-max">
                      Begin session <ArrowRight size={12} />
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center">
                    <p className="text-white/40 text-sm font-serif italic">Find your calm</p>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
