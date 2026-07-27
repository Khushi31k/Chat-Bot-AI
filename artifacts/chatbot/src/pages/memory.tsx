import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  useListMemories,
  useCreateMemory,
  useUpdateMemory,
  useDeleteMemory,
  getListMemoriesQueryKey,
  type Memory,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pin, PinOff, Trash2, Edit2, X, Loader2, Brain } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useToast } from '@/hooks/use-toast';

export default function Memory() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: memories, isLoading } = useListMemories(
    { userId },
    { query: { queryKey: getListMemoriesQueryKey({ userId }), enabled: !!userId } }
  );

  const createMemory = useCreateMemory();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  const filtered = memories?.filter((m: Memory) =>
    !search || m.title.toLowerCase().includes(search.toLowerCase()) || (m.content || '').toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered?.filter((m: Memory) => m.pinned);
  const unpinned = filtered?.filter((m: Memory) => !m.pinned);

  const openAdd = () => {
    setTitle('');
    setContent('');
    setEditingId(null);
    setIsAddOpen(true);
  };

  const openEdit = (m: any) => {
    setTitle(m.title);
    setContent(m.content || '');
    setEditingId(m.id);
    setIsAddOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingId) {
      updateMemory.mutate({ id: editingId, data: { userId, title, content } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey({ userId }) });
          setIsAddOpen(false);
          toast({ title: 'Memory updated', duration: 2000 });
        }
      });
    } else {
      createMemory.mutate({ data: { userId, title, content } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey({ userId }) });
          setIsAddOpen(false);
          toast({ title: 'Memory saved', duration: 2000 });
        }
      });
    }
  };

  const handlePin = (m: Memory) => {
    updateMemory.mutate({ id: m.id, data: { userId, pinned: !m.pinned } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey({ userId }) })
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Delete this memory?')) return;
    deleteMemory.mutate({ id, params: { userId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey({ userId }) });
        toast({ title: 'Memory removed', variant: 'destructive', duration: 2000 });
      }
    });
  };

  const isMutating = createMemory.isPending || updateMemory.isPending;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh]">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="font-serif text-4xl text-white mb-2">Memory</h1>
          <p className="text-muted-foreground text-sm">Tell ELLA what matters. She'll remember it in every conversation.</p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.3)] w-max"
        >
          <Plus size={16} /> Add Memory
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 shrink-0">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search memories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
        ) : memories?.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-white/10 rounded-3xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <Brain size={28} className="text-primary/60" />
            </div>
            <h3 className="text-xl font-serif text-white mb-2">No memories yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Share things with ELLA — your preferences, life context, goals — and she'll use them in every conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-6 pb-10">
            {pinned && pinned.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Pin size={11} /> Pinned
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {pinned.map(m => <MemoryCard key={m.id} memory={m} onEdit={openEdit} onPin={handlePin} onDelete={handleDelete} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {unpinned && unpinned.length > 0 && (
              <div>
                {pinned && pinned.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">All memories</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {unpinned.map(m => <MemoryCard key={m.id} memory={m} onEdit={openEdit} onPin={handlePin} onDelete={handleDelete} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[#0d0d0f] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-md z-50 shadow-2xl focus:outline-none">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="font-serif text-2xl text-white">
                {editingId ? 'Edit Memory' : 'New Memory'}
              </Dialog.Title>
              <Dialog.Close className="text-muted-foreground hover:text-white transition-colors">
                <X size={18} />
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. My morning routine"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-white/20"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Content</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="What should ELLA remember?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 h-28 resize-none placeholder:text-white/20"
                />
              </div>
              <button
                type="submit"
                disabled={isMutating || !title.trim()}
                className="w-full bg-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {isMutating ? <Loader2 className="animate-spin" size={16} /> : (editingId ? 'Update' : 'Save Memory')}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function MemoryCard({ memory, onEdit, onPin, onDelete }: {
  memory: any;
  onEdit: (m: any) => void;
  onPin: (m: any) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors group relative"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-medium text-white leading-snug">{memory.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onPin(memory)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title={memory.pinned ? 'Unpin' : 'Pin'}
          >
            {memory.pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <button
            onClick={() => onEdit(memory)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {memory.content && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{memory.content}</p>
      )}
      {memory.pinned && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-0">
          <Pin size={12} className="text-primary/60 opacity-100" />
        </div>
      )}
    </motion.div>
  );
}
