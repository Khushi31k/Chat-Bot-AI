import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListHabits, 
  useCreateHabit, 
  useDeleteHabit,
  useLogHabit,
  useUnlogHabit,
  useListHabitLogs,
  getListHabitsQueryKey,
  getListHabitLogsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, differenceInDays } from 'date-fns';
import { 
  Plus, Trash2, Check, Loader2, Target, Calendar as CalIcon,
  Droplets, PersonStanding, Book, HeartPulse, Apple, Laptop, Music, Palette, Pill,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as Dialog from '@radix-ui/react-dialog';

const COLORS = ['#6366f1', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

const ICONS = [
  { id: 'droplets', icon: Droplets },
  { id: 'person', icon: PersonStanding },
  { id: 'book', icon: Book },
  { id: 'heart', icon: HeartPulse },
  { id: 'apple', icon: Apple },
  { id: 'laptop', icon: Laptop },
  { id: 'music', icon: Music },
  { id: 'palette', icon: Palette },
  { id: 'pill', icon: Pill }
];

export default function Habits() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  
  // Add form state
  const [name, setName] = useState('');
  const [iconStr, setIconStr] = useState(ICONS[0].id);
  const [color, setColor] = useState(COLORS[0]);

  const { data: habits, isLoading } = useListHabits({ userId }, { query: { queryKey: getListHabitsQueryKey({ userId }), enabled: !!userId } });
  const { data: logs, isLoading: isLoadingLogs } = useListHabitLogs({ userId }, { query: { queryKey: getListHabitLogsQueryKey({ userId }), enabled: !!userId } });

  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createHabit.mutate({ data: { userId, name, icon: iconStr, color } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey({ userId }) });
        setIsAddOpen(false);
        setName('');
        toast({ title: 'Habit created' });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteHabit.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey({ userId }) });
        if (selectedHabitId === id) setSelectedHabitId(null);
        toast({ title: 'Habit deleted' });
      }
    });
  };

  const toggleDayLog = (habitId: number, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLog = logs?.find(l => l.habitId === habitId && l.date.startsWith(dateStr));
    if (existingLog) {
      unlogHabit.mutate({ id: existingLog.id, date: dateStr }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListHabitLogsQueryKey({ userId }) }) });
    } else {
      logHabit.mutate({ id: habitId, data: { userId, date: dateStr } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListHabitLogsQueryKey({ userId }) }) });
    }
  };

  const toggleLog = (habitId: number) => {
    toggleDayLog(habitId, new Date());
  };

  const getStreak = (habitId: number) => {
    if (!logs) return 0;
    const habitLogs = logs.filter(l => l.habitId === habitId).map(l => new Date(l.date));
    habitLogs.sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0,0,0,0);
    
    const hasToday = habitLogs.some(d => isSameDay(d, currentDate));
    const hasYesterday = habitLogs.some(d => isSameDay(d, subDays(currentDate, 1)));

    if (!hasToday && !hasYesterday) return 0;

    let dateToCheck = hasToday ? currentDate : subDays(currentDate, 1);

    while (true) {
      if (habitLogs.some(d => isSameDay(d, dateToCheck))) {
        streak++;
        dateToCheck = subDays(dateToCheck, 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getLongestStreak = (habitId: number) => {
    if (!logs) return 0;
    const habitLogs = logs.filter(l => l.habitId === habitId).map(l => new Date(l.date));
    if (habitLogs.length === 0) return 0;
    
    // Sort descending
    habitLogs.sort((a, b) => b.getTime() - a.getTime());

    let maxStreak = 0;
    let currentStreak = 1;
    let prevDate = habitLogs[0];
    
    for (let i = 1; i < habitLogs.length; i++) {
      const diff = differenceInDays(prevDate, habitLogs[i]);
      if (diff === 1) {
        currentStreak++;
      } else if (diff > 1) {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
      prevDate = habitLogs[i];
    }
    return Math.max(maxStreak, currentStreak);
  };

  const getMonthPct = (habitId: number) => {
    if (!logs) return 0;
    const mStart = startOfMonth(viewMonth);
    const mEnd = endOfMonth(viewMonth);
    const mDays = eachDayOfInterval({ start: mStart, end: mEnd });
    
    const today = new Date();
    const elapsedDays = mDays.filter(d => d <= today).length;
    if (elapsedDays === 0) return 0;

    const logsInMonth = logs.filter(l => {
      if (l.habitId !== habitId) return false;
      const d = new Date(l.date);
      return d >= mStart && d <= mEnd;
    }).length;
    return Math.round((logsInMonth / elapsedDays) * 100);
  };

  const getIconComponent = (id: string) => {
    const found = ICONS.find(i => i.id === id);
    const IconCmp = found ? found.icon : Target;
    return <IconCmp size={24} />;
  };

  const selectedHabit = habits?.find(h => h.id === selectedHabitId);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh]">
      
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="font-serif text-4xl text-white mb-2">Habits</h1>
          <p className="text-muted-foreground">Small steps, every day.</p>
        </div>
        
        <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
          <Dialog.Trigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] w-max">
              <Plus size={16} /> Add Habit
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-md z-50 shadow-2xl focus:outline-none">
              <Dialog.Title className="font-serif text-2xl mb-6 text-white">Create New Habit</Dialog.Title>
              
              <form onSubmit={handleAdd} className="space-y-6">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Read 10 pages"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {ICONS.map(i => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setIconStr(i.id)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all text-white ${iconStr === i.id ? 'bg-white/20 scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        <i.icon size={20} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Color Accent</label>
                  <div className="flex gap-3">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={createHabit.isPending || !name.trim()}
                  className="w-full bg-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 mt-4"
                >
                  {createHabit.isPending ? <Loader2 className="animate-spin" /> : 'Create'}
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
        ) : habits?.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-white/10 rounded-3xl">
            <Target size={48} className="mx-auto text-white/20 mb-4" />
            <p className="font-serif text-2xl text-white/40 mb-2">Small steps, every day.</p>
            <p className="text-muted-foreground text-sm">Add your first habit to begin.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {habits?.map((habit) => {
                  const isDoneToday = logs?.some(l => l.habitId === habit.id && l.date.startsWith(todayStr));
                  const streak = getStreak(habit.id);
                  const isSelected = selectedHabitId === habit.id;

                  return (
                    <motion.div
                      key={habit.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedHabitId(isSelected ? null : habit.id)}
                      className={`glass-card rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border ${
                        isSelected ? 'border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)] bg-white/5' : 'border-transparent'
                      }`}
                    >
                      {/* Top Accent line */}
                      <div className="h-1.5 w-full" style={{ backgroundColor: habit.color }} />
                      
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner text-white" style={{ color: habit.color }}>
                              {getIconComponent(habit.icon)}
                            </div>
                            <div>
                              <h3 className="font-medium text-lg text-white mb-1">{habit.name}</h3>
                              <div className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <span style={{ color: habit.color }}>{streak} day streak</span>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLog(habit.id);
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shrink-0 ${
                              isDoneToday 
                                ? 'bg-primary text-white scale-110 shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                                : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <Check size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Monthly Calendar expanded view below grid */}
            <AnimatePresence>
              {selectedHabit && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  className="glass-card rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: selectedHabit.color }} />
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      {getIconComponent(selectedHabit.icon)}
                      <h2 className="font-serif text-2xl text-white">{selectedHabit.name} Tracker</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <Dialog.Root>
                        <Dialog.Trigger asChild>
                          <button className="text-xs text-destructive hover:underline flex items-center gap-1">
                            <Trash2 size={12} /> Delete
                          </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-sm z-50 shadow-2xl">
                            <Dialog.Title className="font-serif text-2xl mb-2 text-white">Delete Habit</Dialog.Title>
                            <p className="text-muted-foreground text-sm mb-6">Are you sure? This will remove all history for this habit.</p>
                            <div className="flex gap-3">
                              <Dialog.Close asChild>
                                <button className="flex-1 py-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors">Cancel</button>
                              </Dialog.Close>
                              <button onClick={() => handleDelete(selectedHabit.id)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete</button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                      <button onClick={() => setSelectedHabitId(null)} className="text-xs text-muted-foreground hover:text-white transition-colors uppercase tracking-widest font-medium">Close</button>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 md:gap-12">
                    {/* Calendar */}
                    <div className="flex-1 max-w-md">
                      <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setViewMonth(addMonths(viewMonth, -1))} className="p-1.5 text-muted-foreground hover:text-white transition-colors">
                          <ChevronLeft size={18} />
                        </button>
                        <span className="font-medium text-white tracking-wide">{format(viewMonth, 'MMMM yyyy')}</span>
                        <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1.5 text-muted-foreground hover:text-white transition-colors">
                          <ChevronRight size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium uppercase tracking-wider py-1">{d}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 md:gap-2">
                        {Array.from({ length: getDay(startOfMonth(viewMonth)) }).map((_, i) => (
                          <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) }).map((date, i) => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const isLogged = logs?.some(l => l.habitId === selectedHabit.id && l.date.startsWith(dateStr));
                          const isToday = isSameDay(date, new Date());
                          const isFuture = date > new Date();

                          return (
                            <div key={dateStr} className="aspect-square flex items-center justify-center">
                              <button
                                disabled={isFuture}
                                onClick={() => toggleDayLog(selectedHabit.id, date)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isLogged ? 'text-white shadow-lg scale-110' :
                                  isFuture ? 'text-white/10 opacity-30 cursor-default' :
                                  isToday ? 'border-2 border-white/20 text-white/60 hover:border-white/40' :
                                  'bg-white/5 border border-transparent text-white/40 hover:bg-white/10 hover:text-white'
                                }`}
                                style={isLogged ? { backgroundColor: selectedHabit.color } : {}}
                                title={format(date, 'MMM d')}
                              >
                                <span className={`text-xs ${isLogged ? 'font-bold' : 'font-normal'}`}>{format(date, 'd')}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 flex flex-col justify-center gap-6">
                      <div className="glass-card bg-black/20 p-5 rounded-2xl border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Current Streak</p>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-4xl text-white">{getStreak(selectedHabit.id)}</span>
                          <span className="text-sm text-white/50">days</span>
                        </div>
                      </div>
                      <div className="glass-card bg-black/20 p-5 rounded-2xl border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Longest Streak</p>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-4xl text-white">{getLongestStreak(selectedHabit.id)}</span>
                          <span className="text-sm text-white/50">days</span>
                        </div>
                      </div>
                      <div className="glass-card bg-black/20 p-5 rounded-2xl border border-white/5">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">This Month</p>
                        <div className="flex items-baseline gap-2">
                          <span className="font-serif text-4xl text-white">{getMonthPct(selectedHabit.id)}%</span>
                          <span className="text-sm text-white/50">completion</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
