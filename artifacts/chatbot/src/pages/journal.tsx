import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListJournalEntries, 
  useCreateJournalEntry, 
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  useSummarizeJournalEntry,
  getListJournalEntriesQueryKey,
  getListJournalEntriesQueryKey as getJournalEntriesKey,
  JournalEntry
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PenTool, Plus, Trash2, Loader2, Calendar, Search, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MOODS = [
  { id: 'amazing', emoji: '✦', label: 'Amazing', color: 'text-amber-400' },
  { id: 'good',    emoji: '◆', label: 'Good',    color: 'text-emerald-400' },
  { id: 'neutral', emoji: '●', label: 'Neutral',  color: 'text-sky-400' },
  { id: 'low',     emoji: '◇', label: 'Low',      color: 'text-violet-400' },
  { id: 'rough',   emoji: '△', label: 'Rough',    color: 'text-rose-400' },
];

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(text: string) {
  const words = wordCount(text);
  const minutes = Math.ceil(words / 200);
  return minutes <= 1 ? '1 min read' : `${minutes} min read`;
}

export default function Journal() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeEntryId, setActiveEntryId] = useState<number | 'new' | null>(null);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const { data: entries, isLoading } = useListJournalEntries({ userId }, { query: { queryKey: getListJournalEntriesQueryKey({ userId }), enabled: !!userId } });
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const summarizeEntry = useSummarizeJournalEntry();

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeEntry = activeEntryId !== 'new' ? entries?.find(e => e.id === activeEntryId) : null;
  const isSaving = createEntry.isPending || updateEntry.isPending;

  const filteredEntries = entries?.filter(e =>
    !search || e.content?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (activeEntryId === 'new') {
      setContent('');
      setMood('neutral');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAiSummary('');
      setShowSummary(false);
    } else if (activeEntry) {
      setContent(activeEntry.content);
      setMood(activeEntry.mood || 'neutral');
      setDate(activeEntry.date.split('T')[0]);
      setAiSummary('');
      setShowSummary(false);
    }
  }, [activeEntryId, activeEntry?.id]);

  // Debounced autosave
  const performSave = useCallback(() => {
    if (!content.trim()) return;

    if (activeEntryId === 'new') {
      createEntry.mutate({ data: { userId, content, mood, date } }, {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey({ userId }) });
          setActiveEntryId(data.id);
          toast({ title: 'Saved', duration: 1500 });
        }
      });
    } else if (activeEntry) {
      updateEntry.mutate({ id: activeEntry.id, data: { content, mood } }, {
        onSuccess: () => {
          queryClient.setQueryData(getListJournalEntriesQueryKey({ userId }), (old: JournalEntry[] | undefined) =>
            old ? old.map(e => e.id === activeEntry.id ? { ...e, content, mood } : e) : old
          );
        }
      });
    }
  }, [content, mood, activeEntryId, activeEntry, userId, date]);

  useEffect(() => {
    if (!activeEntryId || !content) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(performSave, 2000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [content, mood]);

  const handleManualSave = () => {
    clearTimeout(saveTimeoutRef.current);
    performSave();
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this entry?')) return;
    deleteEntry.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey({ userId }) });
        if (activeEntryId === id) setActiveEntryId(null);
        toast({ title: 'Entry deleted', variant: 'destructive', duration: 2000 });
      }
    });
  };

  const handleSummarize = () => {
    const entryId = activeEntryId !== 'new' ? activeEntryId : null;
    if (!entryId) {
      toast({ title: 'Save your entry first', duration: 2000 });
      return;
    }
    setIsSummarizing(true);
    setShowSummary(true);
    summarizeEntry.mutate({ id: entryId as number }, {
      onSuccess: (data) => {
        setAiSummary((data as { summary?: string }).summary || 'No summary available.');
        setIsSummarizing(false);
      },
      onError: () => {
        setAiSummary('Could not generate summary. Try again.');
        setIsSummarizing(false);
      }
    });
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[100dvh] w-full bg-background overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-72 border-r border-white/5 bg-sidebar flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-white">Journal</h2>
            <button 
              onClick={() => setActiveEntryId('new')}
              className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search entries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" size={18} /></div>
          ) : filteredEntries?.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs p-6">
              {search ? 'No entries match.' : (
                <div className="flex flex-col items-center gap-3">
                  <p className="font-serif italic text-white/30 text-sm text-center px-2 leading-relaxed">
                    "Every meaningful story begins with a single page."
                  </p>
                </div>
              )}
            </div>
          ) : (
            filteredEntries?.map((entry) => {
              const moodData = MOODS.find(m => m.id === entry.mood);
              return (
                <div 
                  key={entry.id}
                  onClick={() => setActiveEntryId(entry.id)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all duration-150 border border-transparent ${
                    activeEntryId === entry.id 
                      ? 'bg-white/8 border-white/8' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-primary/70">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs ${moodData?.color || 'text-white/40'}`}>{moodData?.emoji}</span>
                      <button 
                        onClick={(e) => handleDelete(entry.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {entry.content || 'Empty entry...'}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: '#0c0c10', boxShadow: 'inset 6px 0 24px rgba(0,0,0,0.35), inset -6px 0 24px rgba(0,0,0,0.2)' }}>
        
        {!activeEntryId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-20 h-20 rounded-3xl bg-white/3 border border-white/8 flex items-center justify-center mb-6 mx-auto">
                <PenTool size={28} className="text-white/20" />
              </div>
              <h2 className="font-serif text-4xl mb-3 text-white">Your Private Space</h2>
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed mb-8">
                Document your thoughts, track your journey, and reflect on your days.
              </p>
              <button 
                onClick={() => setActiveEntryId('new')}
                className="bg-white/8 text-white px-6 py-3 rounded-2xl text-sm font-medium hover:bg-white/15 transition-colors flex items-center gap-2 mx-auto border border-white/10"
              >
                <PenTool size={14} /> New Entry
              </button>
            </motion.div>
          </div>
        ) : (
          <motion.div 
            key={activeEntryId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            {/* Editor Header */}
            <div className="px-6 md:px-10 py-4 border-b border-white/5 flex flex-wrap gap-3 items-center justify-between bg-[#0d0d0f]/80 backdrop-blur-md sticky top-0 z-10">
              
              <div className="flex items-center gap-3">
                {activeEntryId === 'new' ? (
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/8 text-xs">
                    <Calendar size={13} className="text-primary/60" />
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent text-white/70 outline-none border-none text-xs [color-scheme:dark]"
                    />
                  </div>
                ) : (
                  <div className="font-serif text-2xl text-white/90">
                    {format(new Date(activeEntry?.date || new Date()), 'MMMM d, yyyy')}
                  </div>
                )}
                {content && (
                  <span className="text-xs text-white/25">{wordCount(content)} words · {readingTime(content)}</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Mood selector */}
                <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-full border border-white/8">
                  {MOODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMood(m.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                        mood === m.id ? 'bg-white/15 scale-110' : 'opacity-40 hover:opacity-70 hover:bg-white/5'
                      } ${m.color}`}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing || !content.trim() || activeEntryId === 'new'}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-indigo-400 transition-colors disabled:opacity-30"
                  title="AI Summary"
                >
                  <Sparkles size={13} />
                </button>
                
                <button
                  onClick={handleManualSave}
                  disabled={isSaving || !content.trim()}
                  className="bg-primary/15 text-primary hover:bg-primary/25 px-4 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 size={11} className="animate-spin" />}
                  Save
                </button>
              </div>
            </div>

            {/* AI Summary Panel */}
            <AnimatePresence>
              {showSummary && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-indigo-500/20 bg-indigo-500/5"
                >
                  <div className="px-6 md:px-10 py-4 flex items-start gap-3">
                    <Sparkles size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-indigo-400 font-medium mb-1 uppercase tracking-wider">ELLA's Summary</p>
                      {isSummarizing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={13} className="animate-spin text-indigo-400" />
                          <span className="text-xs text-muted-foreground">Reflecting on your entry...</span>
                        </div>
                      ) : (
                        <p className="text-sm text-white/70 leading-relaxed font-serif italic">{aiSummary}</p>
                      )}
                    </div>
                    <button onClick={() => setShowSummary(false)} className="text-muted-foreground hover:text-white transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lined Paper Textarea */}
            <div
              className="flex-1 overflow-y-auto no-scrollbar relative"
              style={{
                /* Ruled lines scrolling with content */
                backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(255,255,255,0.07) 31px, rgba(255,255,255,0.07) 32px)',
                backgroundPosition: '0 48px',
                backgroundSize: '100% 32px',
                /* scroll with content so lines stay under text */
                backgroundAttachment: 'local',
                /* subtle inner vignette for page depth */
                boxShadow: 'inset 8px 0 24px rgba(0,0,0,0.25), inset -8px 0 24px rgba(0,0,0,0.15)',
              }}
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full h-full min-h-[500px] bg-transparent text-white/85 placeholder:text-white/15 text-lg focus:outline-none resize-none font-serif px-10 md:px-16 py-12"
                autoFocus
                style={{ lineHeight: '2rem' }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
