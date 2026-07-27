import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListMoodLogs, 
  useCreateMoodLog,
  getListMoodLogsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays, isSameDay } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MOODS = [
  { id: 'amazing', emoji: '🤩', label: 'Amazing', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  { id: 'good', emoji: '🙂', label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  { id: 'neutral', emoji: '😐', label: 'Neutral', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  { id: 'low', emoji: '😔', label: 'Low', color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/30' },
  { id: 'rough', emoji: '😞', label: 'Rough', color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
];

export default function Mood() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const { data: moodLogs, isLoading } = useListMoodLogs({ userId }, { query: { enabled: !!userId } });
  const createMoodLog = useCreateMoodLog();

  const handleLogMood = () => {
    if (!selectedMood) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // Check if already logged today
    const alreadyLogged = moodLogs?.some(log => log.date.startsWith(todayStr));
    if (alreadyLogged && !confirm('You already logged a mood today. Add another?')) {
      return;
    }

    createMoodLog.mutate({ 
      data: { userId, mood: selectedMood, note: note || undefined, date: todayStr } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMoodLogsQueryKey({ userId }) });
        setSelectedMood(null);
        setNote('');
        toast({ title: 'Mood logged', duration: 2000 });
      }
    });
  };

  const getMoodConfig = (id: string) => MOODS.find(m => m.id === id) || MOODS[2];

  // 14 day trend
  const past14Days = Array.from({ length: 14 }).map((_, i) => subDays(new Date(), 13 - i));

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh] overflow-y-auto no-scrollbar">
      
      <div className="mb-12 shrink-0 text-center">
        <h1 className="font-serif text-4xl text-white mb-2">How are you feeling?</h1>
        <p className="text-muted-foreground">Take a moment to check in with yourself.</p>
      </div>

      <div className="mb-12 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => setSelectedMood(mood.id)}
              className={`glass-card rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                selectedMood === mood.id 
                  ? `${mood.bg} ${mood.border} scale-105 shadow-[0_0_30px_rgba(255,255,255,0.1)]` 
                  : 'hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <span className={`text-5xl transition-transform duration-300 ${selectedMood === mood.id ? 'scale-125' : ''}`}>
                {mood.emoji}
              </span>
              <span className={`font-medium ${selectedMood === mood.id ? mood.color : 'text-muted-foreground'}`}>
                {mood.label}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selectedMood && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Why do you feel this way? (Optional)"
                  className="w-full h-24 bg-transparent text-white placeholder:text-muted-foreground focus:outline-none resize-none mb-4"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleLogMood}
                    disabled={createMoodLog.isPending}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors shadow-lg flex items-center gap-2"
                  >
                    {createMoodLog.isPending && <Loader2 size={16} className="animate-spin" />}
                    Log Mood
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Trend */}
        <div className="md:col-span-1 glass-card rounded-3xl p-6 h-max">
          <h3 className="font-serif text-xl text-white mb-6">14-Day Trend</h3>
          <div className="flex flex-wrap gap-2">
            {past14Days.map((date, i) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const log = moodLogs?.find(l => l.date.startsWith(dateStr));
              const config = log ? getMoodConfig(log.mood) : null;

              return (
                <div 
                  key={i}
                  title={format(date, 'MMM d')}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    config ? config.bg + ' ' + config.border + ' border' : 'bg-white/5'
                  }`}
                >
                  {config ? config.emoji : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* History */}
        <div className="md:col-span-2 glass-card rounded-3xl p-6 flex flex-col max-h-[500px]">
          <h3 className="font-serif text-xl text-white mb-6 shrink-0">Recent Logs</h3>
          
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : moodLogs?.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">No mood logs yet.</div>
            ) : (
              moodLogs?.slice(0, 10).map((log) => {
                const config = getMoodConfig(log.mood);
                return (
                  <div key={log.id} className="flex gap-4 items-start p-4 rounded-2xl bg-white/5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${config.bg} ${config.border} border`}>
                      {config.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-muted-foreground">&bull;</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                      </div>
                      {log.note && (
                        <p className="text-sm text-white/80">{log.note}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
