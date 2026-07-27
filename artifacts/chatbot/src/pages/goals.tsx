import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListGoals, 
  useCreateGoal, 
  useUpdateGoal,
  useDeleteGoal,
  getListGoalsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Loader2, Target, Calendar } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

const CATEGORIES = ['All', 'Career', 'Fitness', 'Learning', 'Finance', 'Personal'];
const PURE_CATEGORIES = CATEGORIES.slice(1);

export default function Goals() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Add state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(PURE_CATEGORIES[0]);
  const [targetDate, setTargetDate] = useState('');

  const { data: goals, isLoading } = useListGoals({ userId }, { query: { queryKey: getListGoalsQueryKey({ userId }), enabled: !!userId } });
  
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createGoal.mutate({ 
      data: { 
        userId, title, description, category, targetDate: targetDate ? new Date(targetDate).toISOString() : undefined 
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey({ userId }) });
        setIsAddOpen(false);
        setTitle('');
        setDescription('');
        setTargetDate('');
      }
    });
  };

  const handleUpdateProgress = (id: number, progress: number) => {
    updateGoal.mutate({ id, data: { progress } }, {
      onSuccess: () => {
        // Optimistic cache update
        queryClient.setQueryData(getListGoalsQueryKey({ userId }), (old: any) => 
          old ? old.map((g: any) => g.id === id ? { ...g, progress } : g) : old
        );
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this goal?')) return;
    deleteGoal.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGoalsQueryKey({ userId }) })
    });
  };

  const filteredGoals = goals?.filter(g => activeTab === 'All' || g.category === activeTab);

  // SVG Progress Ring Component
  const ProgressRing = ({ progress, size = 120, strokeWidth = 8 }: { progress: number; size?: number; strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            className="text-white/10"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <motion.circle
            className="text-primary transition-all duration-1000 ease-out"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-serif">{Math.round(progress)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="font-serif text-4xl text-white mb-2">Goals</h1>
          <p className="text-muted-foreground">What you focus on grows.</p>
        </div>
        
        <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
          <Dialog.Trigger asChild>
            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] w-max">
              <Plus size={16} /> New Goal
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-md z-50 shadow-2xl">
              <Dialog.Title className="font-serif text-2xl mb-6 text-white">Define a Goal</Dialog.Title>
              
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-[#15151a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                  >
                    {PURE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Target Date (Optional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 h-24 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={createGoal.isPending || !title.trim()}
                  className="w-full bg-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 mt-4"
                >
                  {createGoal.isPending ? <Loader2 className="animate-spin" /> : 'Set Goal'}
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <Tabs.List className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2 shrink-0">
          {CATEGORIES.map(c => (
            <Tabs.Trigger
              key={c}
              value={c}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === c 
                  ? 'bg-white text-black shadow-md' 
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white'
              }`}
            >
              {c}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
          ) : filteredGoals?.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-white/10 rounded-3xl">
              <Target size={48} className="mx-auto text-white/20 mb-4" />
              <p className="font-serif text-2xl text-white/40 mb-2">Every achievement starts with a clear intention.</p>
              <p className="text-muted-foreground text-sm">Set your first goal.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence>
                {filteredGoals?.map((goal) => (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center"
                  >
                    <div className="shrink-0">
                      <ProgressRing progress={goal.progress} />
                    </div>
                    
                    <div className="flex-1 w-full">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
                            {goal.category}
                          </span>
                          <h3 className="text-2xl font-serif text-white mt-3 leading-tight">{goal.title}</h3>
                        </div>
                        <button 
                          onClick={() => handleDelete(goal.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {goal.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{goal.description}</p>
                      )}

                      {goal.targetDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
                          <Calendar size={12} /> Target: {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      )}

                      <div className="mt-auto">
                        <label className="text-xs text-muted-foreground mb-2 block">Update Progress</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={goal.progress}
                          onChange={(e) => handleUpdateProgress(goal.id, Number(e.target.value))}
                          className="w-full accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Tabs.Root>
    </div>
  );
}
