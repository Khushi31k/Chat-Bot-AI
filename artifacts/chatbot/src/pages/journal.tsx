import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListJournalEntries, 
  useCreateJournalEntry, 
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  getListJournalEntriesQueryKey,
  JournalEntry
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PenTool, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MOODS = [
  { id: 'amazing', emoji: '🤩', label: 'Amazing' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'neutral', emoji: '😐', label: 'Neutral' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'rough', emoji: '😞', label: 'Rough' },
];

export default function Journal() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeEntryId, setActiveEntryId] = useState<number | 'new' | null>(null);
  
  // Editor state
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: entries, isLoading } = useListJournalEntries({ userId }, { query: { enabled: !!userId } });
  
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  const activeEntry = activeEntryId !== 'new' ? entries?.find(e => e.id === activeEntryId) : null;
  const isSaving = createEntry.isPending || updateEntry.isPending;

  // Auto-save logic
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (activeEntryId === 'new') {
      setContent('');
      setMood('neutral');
      setDate(format(new Date(), 'yyyy-MM-dd'));
    } else if (activeEntry) {
      setContent(activeEntry.content);
      setMood(activeEntry.mood || 'neutral');
      setDate(activeEntry.date.split('T')[0]); // handle ISO string safely
    }
  }, [activeEntryId, activeEntry]);

  // Handle explicit save (button click)
  const handleSave = () => {
    if (!content.trim()) return;

    if (activeEntryId === 'new') {
      createEntry.mutate({ data: { userId, content, mood, date } }, {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey({ userId }) });
          setActiveEntryId(data.id);
          toast({ title: 'Entry saved', duration: 2000 });
        }
      });
    } else if (activeEntry) {
      updateEntry.mutate({ id: activeEntry.id, data: { content, mood } }, {
        onSuccess: () => {
          // Patch cache locally to avoid full refetch
          queryClient.setQueryData(getListJournalEntriesQueryKey({ userId }), (old: JournalEntry[] | undefined) => 
            old ? old.map(e => e.id === activeEntry.id ? { ...e, content, mood } : e) : old
          );
          toast({ title: 'Entry updated', duration: 2000 });
        }
      });
    }
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this entry?')) return;
    
    deleteEntry.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey({ userId }) });
        if (activeEntryId === id) setActiveEntryId(null);
        toast({ title: 'Entry deleted', variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[100dvh] w-full bg-background overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 bg-sidebar flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-white">Journal</h2>
          <button 
            onClick={() => setActiveEntryId('new')}
            className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : entries?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm p-4">No entries yet.</div>
          ) : (
            entries?.map((entry) => (
              <div 
                key={entry.id}
                onClick={() => setActiveEntryId(entry.id)}
                className={`group p-4 rounded-2xl cursor-pointer transition-all duration-200 border border-transparent ${
                  activeEntryId === entry.id 
                    ? 'bg-white/10 border-white/10' 
                    : 'hover:bg-white/5 hover:border-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{MOODS.find(m => m.id === entry.mood)?.emoji}</span>
                    <button 
                      onClick={(e) => handleDelete(entry.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {entry.content || 'Empty entry...'}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative bg-[#0a0a0f]">
        
        {!activeEntryId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-6">
              <PenTool size={32} className="text-primary/50" />
            </div>
            <h2 className="font-serif text-3xl mb-2 text-white">Your Private Space</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Document your thoughts, track your journey, and reflect on your days.
            </p>
            <button 
              onClick={() => setActiveEntryId('new')}
              className="bg-white/10 text-white px-6 py-3 rounded-full font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <PenTool size={16} /> Write New Entry
            </button>
          </div>
        ) : (
          <motion.div 
            key={activeEntryId} // Force re-render on entry change for animation
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {/* Editor Header */}
            <div className="p-6 md:px-10 border-b border-white/5 flex flex-wrap gap-4 items-center justify-between bg-background/50 backdrop-blur-md sticky top-0 z-10">
              
              <div className="flex items-center gap-4">
                {activeEntryId === 'new' ? (
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-sm">
                    <Calendar size={16} className="text-primary" />
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent text-white outline-none border-none"
                    />
                  </div>
                ) : (
                  <div className="font-serif text-3xl text-white">
                    {format(new Date(activeEntry?.date || new Date()), 'MMMM d, yyyy')}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
                  {MOODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMood(m.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                        mood === m.id ? 'bg-white/10 scale-110 shadow-lg' : 'opacity-50 hover:opacity-100 hover:bg-white/5'
                      }`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={handleSave}
                  disabled={isSaving || !content.trim()}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  Save
                </button>
              </div>

            </div>

            {/* Text Area */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full h-full min-h-[500px] bg-transparent text-white/90 placeholder:text-white/20 text-lg leading-relaxed focus:outline-none resize-none font-sans"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
