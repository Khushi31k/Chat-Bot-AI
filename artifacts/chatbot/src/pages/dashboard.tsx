import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  useListMoodLogs, 
  useListHabits, 
  useListJournalEntries, 
  useListGoals 
} from '@workspace/api-client-react';
import { format, isToday } from 'date-fns';
import { ArrowRight, BookOpen, Target, Activity, Smile } from 'lucide-react';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user } = useAuth();
  const userId = user?.userId || 0;

  // Fetch some quick data
  const { data: moodLogs } = useListMoodLogs({ userId }, { query: { enabled: !!userId } });
  const { data: habits } = useListHabits({ userId }, { query: { enabled: !!userId } });
  const { data: journalEntries } = useListJournalEntries({ userId }, { query: { enabled: !!userId } });
  const { data: goals } = useListGoals({ userId }, { query: { enabled: !!userId } });

  const todayMood = moodLogs?.find(log => isToday(new Date(log.date)));
  const recentJournal = journalEntries?.[0];
  const activeGoals = goals?.filter(g => g.progress < 100).slice(0, 2);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-12"
      >
        <h1 className="font-serif text-5xl text-white mb-2 tracking-wide">
          {getGreeting()}, {user?.username}
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome to your private sanctuary.
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Mood Card */}
        <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Smile size={64} />
          </div>
          <div className="flex items-center gap-3 mb-4 text-primary">
            <Smile size={20} />
            <h3 className="font-medium text-sm tracking-widest uppercase">TODAY'S MOOD</h3>
          </div>
          {todayMood ? (
            <div>
              <p className="text-3xl mb-2 capitalize font-serif">{todayMood.mood}</p>
              {todayMood.note && <p className="text-sm text-muted-foreground line-clamp-2">{todayMood.note}</p>}
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground text-sm mb-4">How are you feeling?</p>
              <Link href="/mood" className="inline-flex items-center gap-2 text-xs font-medium bg-primary/20 text-primary px-3 py-1.5 rounded-full hover:bg-primary/30 transition-colors">
                Log Mood <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </motion.div>

        {/* Habits Card */}
        <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={64} />
          </div>
          <div className="flex items-center gap-3 mb-4 text-primary">
            <Activity size={20} />
            <h3 className="font-medium text-sm tracking-widest uppercase">HABITS</h3>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-serif">{habits?.length || 0}</span>
            <span className="text-muted-foreground mb-1">active</span>
          </div>
          <Link href="/habits" className="text-xs text-primary hover:underline flex items-center gap-1 mt-4">
            Track today's progress <ArrowRight size={12} />
          </Link>
        </motion.div>

        {/* Recent Journal */}
        <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 md:col-span-2 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen size={64} />
          </div>
          <div className="flex items-center gap-3 mb-4 text-primary">
            <BookOpen size={20} />
            <h3 className="font-medium text-sm tracking-widest uppercase">RECENT ENTRY</h3>
          </div>
          {recentJournal ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">{format(new Date(recentJournal.date), 'MMMM d, yyyy')}</p>
              <p className="text-white line-clamp-2 leading-relaxed">{recentJournal.content}</p>
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground text-sm mb-4">Your mind is a blank canvas today.</p>
              <Link href="/journal" className="inline-flex items-center gap-2 text-xs font-medium bg-primary/20 text-primary px-3 py-1.5 rounded-full hover:bg-primary/30 transition-colors">
                Write an entry <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </motion.div>

        {/* Goals */}
        <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 md:col-span-4 mt-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-primary">
              <Target size={20} />
              <h3 className="font-medium text-sm tracking-widest uppercase">UPCOMING GOALS</h3>
            </div>
            <Link href="/goals" className="text-xs text-muted-foreground hover:text-white transition-colors">
              View all
            </Link>
          </div>
          
          {activeGoals && activeGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGoals.map(goal => (
                <div key={goal.id} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{goal.title}</h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{goal.category}</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-1000"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-4">No active goals.</p>
              <Link href="/goals" className="inline-flex items-center gap-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-full transition-colors border border-white/10">
                Set a goal <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
}
