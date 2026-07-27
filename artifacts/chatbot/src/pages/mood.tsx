import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  useListMoodLogs,
  useCreateMoodLog,
  getListMoodLogsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const MOODS = [
  {
    id: 'amazing',
    label: 'Amazing',
    description: 'Feeling on top of the world',
    score: 5,
    gradient: 'from-amber-500/20 to-yellow-500/10',
    border: 'border-amber-400/30',
    activeBorder: 'border-amber-400/70',
    text: 'text-amber-400',
    glow: 'rgba(251,191,36,0.2)',
    symbol: '✦',
  },
  {
    id: 'good',
    label: 'Good',
    description: 'Things are going well',
    score: 4,
    gradient: 'from-emerald-500/20 to-teal-500/10',
    border: 'border-emerald-400/30',
    activeBorder: 'border-emerald-400/70',
    text: 'text-emerald-400',
    glow: 'rgba(52,211,153,0.2)',
    symbol: '◆',
  },
  {
    id: 'neutral',
    label: 'Neutral',
    description: 'Steady and even',
    score: 3,
    gradient: 'from-sky-500/20 to-blue-500/10',
    border: 'border-sky-400/30',
    activeBorder: 'border-sky-400/70',
    text: 'text-sky-400',
    glow: 'rgba(56,189,248,0.2)',
    symbol: '●',
  },
  {
    id: 'low',
    label: 'Low',
    description: 'A bit down today',
    score: 2,
    gradient: 'from-violet-500/20 to-purple-500/10',
    border: 'border-violet-400/30',
    activeBorder: 'border-violet-400/70',
    text: 'text-violet-400',
    glow: 'rgba(167,139,250,0.2)',
    symbol: '◇',
  },
  {
    id: 'rough',
    label: 'Rough',
    description: 'Struggling today',
    score: 1,
    gradient: 'from-rose-500/20 to-red-500/10',
    border: 'border-rose-400/30',
    activeBorder: 'border-rose-400/70',
    text: 'text-rose-400',
    glow: 'rgba(251,113,133,0.2)',
    symbol: '△',
  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const mood = MOODS.find(m => m.score === payload[0].value);
    return (
      <div className="glass-card rounded-xl px-3 py-2 text-sm border border-white/10">
        <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
        <p className="text-white font-medium">{mood?.label || payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function Mood() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: moodLogs, isLoading } = useListMoodLogs({ userId }, { query: { queryKey: getListMoodLogsQueryKey({ userId }), enabled: !!userId } });
  const createMoodLog = useCreateMoodLog();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMood) return;

    createMoodLog.mutate({
      data: {
        userId,
        mood: selectedMood,
        note: `Energy: ${energy}/10, Stress: ${stress}/10${note ? '. ' + note : ''}`,
        date: new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMoodLogsQueryKey({ userId }) });
        setSubmitted(true);
        toast({ title: 'Mood logged', duration: 2000 });
        setTimeout(() => {
          setSubmitted(false);
          setSelectedMood(null);
          setNote('');
          setEnergy(5);
          setStress(5);
        }, 2000);
      }
    });
  };

  // Build 14-day chart data
  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = moodLogs?.find(l => l.date.startsWith(dateStr));
    const mood = MOODS.find(m => m.id === log?.mood);
    return {
      date: format(d, 'MMM d'),
      score: mood?.score || null,
      mood: log?.mood || null,
    };
  });

  const hasChartData = chartData.some(d => d.score !== null);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col min-h-[calc(100dvh-4rem)] md:min-h-[100dvh]">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <h1 className="font-serif text-5xl text-white mb-2">Mood</h1>
        <p className="text-muted-foreground text-sm">How are you feeling right now?</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-10">

        {/* Log Form */}
        <div>
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center border border-white/5"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4"
                >
                  <Check size={24} className="text-primary" />
                </motion.div>
                <p className="font-serif text-2xl text-white mb-1">Mood logged</p>
                <p className="text-muted-foreground text-sm">ELLA has noted how you're feeling.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="space-y-8"
              >
                {/* Mood Cards */}
                <div className="grid grid-cols-1 gap-3">
                  {MOODS.map(mood => (
                    <motion.button
                      key={mood.id}
                      type="button"
                      onClick={() => setSelectedMood(mood.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 bg-gradient-to-r ${mood.gradient} ${
                        selectedMood === mood.id ? mood.activeBorder : mood.border
                      }`}
                      style={selectedMood === mood.id ? { boxShadow: `0 0 20px ${mood.glow}` } : {}}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl ${mood.text} font-serif`}>{mood.symbol}</span>
                        <div>
                          <p className={`font-medium ${mood.text}`}>{mood.label}</p>
                          <p className="text-xs text-white/40 mt-0.5">{mood.description}</p>
                        </div>
                        {selectedMood === mood.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`ml-auto w-5 h-5 rounded-full ${mood.text} border-2 flex items-center justify-center`}
                            style={{ borderColor: 'currentColor' }}
                          >
                            <Check size={11} />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Sliders */}
                <AnimatePresence>
                  {selectedMood && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-5 overflow-hidden"
                    >
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium text-white/70">Energy</label>
                          <span className="text-sm text-muted-foreground">{energy}/10</span>
                        </div>
                        <input
                          type="range" min="1" max="10" value={energy}
                          onChange={e => setEnergy(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium text-white/70">Stress</label>
                          <span className="text-sm text-muted-foreground">{stress}/10</span>
                        </div>
                        <input
                          type="range" min="1" max="10" value={stress}
                          onChange={e => setStress(Number(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-rose-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-rose-400 [&::-webkit-slider-thumb]:rounded-full"
                        />
                      </div>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add a note (optional)..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 h-20 resize-none"
                      />
                      <button
                        type="submit"
                        disabled={createMoodLog.isPending}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
                      >
                        {createMoodLog.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Log Mood'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Chart & History */}
        <div className="space-y-6">

          {/* 14-day chart */}
          <div className="glass-card rounded-3xl p-6 border border-white/5">
            <h3 className="font-serif text-xl text-white mb-6">14-day Trend</h3>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
            ) : !hasChartData ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Log your mood daily to see trends.</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis 
                    domain={[1, 5]} 
                    ticks={[1,2,3,4,5]} 
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    width={0}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ fill: '#818cf8', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#818cf8' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent logs */}
          <div className="glass-card rounded-3xl p-6 border border-white/5">
            <h3 className="font-serif text-xl text-white mb-5">Recent Logs</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto no-scrollbar">
              {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" size={18} /></div>
              ) : moodLogs?.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No mood logs yet.</p>
              ) : (
                moodLogs?.slice(0, 8).map(log => {
                  const m = MOODS.find(m => m.id === log.mood);
                  return (
                    <div key={log.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className={`text-lg font-serif ${m?.text || 'text-white/40'}`}>{m?.symbol || '●'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${m?.text || 'text-white'}`}>{m?.label || log.mood}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(log.date), 'MMM d')}</span>
                        </div>
                        {log.note && <p className="text-xs text-muted-foreground truncate mt-0.5">{log.note}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
