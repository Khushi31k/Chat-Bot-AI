import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListCalendarEvents, 
  useCreateCalendarEvent, 
  useDeleteCalendarEvent,
  getListCalendarEventsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2, Calendar as CalIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

const TYPES = ['event', 'reminder', 'deadline'];
const TYPE_COLORS = {
  event: 'bg-indigo-500',
  reminder: 'bg-emerald-500',
  deadline: 'bg-rose-500'
};

export default function Calendar() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [type, setType] = useState('event');

  const { data: events, isLoading } = useListCalendarEvents({ userId }, { query: { queryKey: getListCalendarEventsQueryKey({ userId }), enabled: !!userId } });
  
  const createEvent = useCreateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createEvent.mutate({ 
      data: { userId, title, type, date: format(selectedDate, 'yyyy-MM-dd') } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey({ userId }) });
        setIsAddOpen(false);
        setTitle('');
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteEvent.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCalendarEventsQueryKey({ userId }) })
    });
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const selectedDayEvents = events?.filter(e => e.date.startsWith(format(selectedDate, 'yyyy-MM-dd'))) || [];

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col h-[calc(100dvh-4rem)] md:h-[100dvh]">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h1 className="font-serif text-4xl text-white mb-2">Calendar</h1>
          <p className="text-muted-foreground">Time is your most valuable asset.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        
        {/* Calendar View */}
        <div className="flex-1 glass-card rounded-3xl p-6 md:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-serif text-white">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-sm font-medium text-white"
              >
                Today
              </button>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2 flex-1">
            {/* Empty slots for start of month offset */}
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {days.map((date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const dayEvents = events?.filter(e => e.date.startsWith(dateStr)) || [];
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(date)}
                  className={`relative p-2 rounded-2xl flex flex-col items-center transition-all ${
                    isSelected ? 'bg-primary/20 ring-1 ring-primary' : 
                    isToday ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <span className={`text-sm font-medium mb-1 ${
                    isSelected ? 'text-primary' : 
                    isToday ? 'text-white' : 'text-muted-foreground'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  
                  <div className="flex gap-1 justify-center mt-auto">
                    {dayEvents.slice(0, 3).map((e, i) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[e.type as keyof typeof TYPE_COLORS] || 'bg-primary'}`} 
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
          <div className="glass-card rounded-3xl p-6 flex-1 flex flex-col">
            <div className="mb-6 pb-6 border-b border-white/5">
              <h3 className="font-serif text-2xl text-white mb-1">{format(selectedDate, 'EEEE')}</h3>
              <p className="text-muted-foreground text-sm">{format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 mb-6">
              {isLoading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="text-center p-6">
                  <CalIcon size={32} className="mx-auto text-white/20 mb-3" />
                  <p className="text-muted-foreground text-sm">No events for this day.</p>
                </div>
              ) : (
                selectedDayEvents.map(event => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={event.id} 
                    className="bg-white/5 rounded-2xl p-4 group relative"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[event.type as keyof typeof TYPE_COLORS] || 'bg-primary'}`} />
                      <div className="flex-1 truncate">
                        <p className="text-white text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{event.type}</p>
                      </div>
                      <button 
                        onClick={() => handleDelete(event.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:text-destructive transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
              <Dialog.Trigger asChild>
                <button className="w-full bg-white/10 text-white py-3 rounded-full font-medium hover:bg-white/20 transition-colors flex items-center justify-center gap-2 mt-auto">
                  <Plus size={16} /> Add Event
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-md z-50 shadow-2xl">
                  <Dialog.Title className="font-serif text-2xl mb-6 text-white">
                    Add to {format(selectedDate, 'MMM d')}
                  </Dialog.Title>
                  
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
                      <label className="block text-sm text-muted-foreground mb-1">Type</label>
                      <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="w-full bg-[#15151a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none capitalize"
                      >
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <button 
                      type="submit"
                      disabled={createEvent.isPending || !title.trim()}
                      className="w-full bg-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 mt-4"
                    >
                      {createEvent.isPending ? <Loader2 className="animate-spin" /> : 'Save Event'}
                    </button>
                  </form>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

          </div>
        </div>
      </div>
    </div>
  );
}
