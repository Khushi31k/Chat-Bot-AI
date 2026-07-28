import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShaderBackground } from '@/components/ui/electric-aura';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListOpenaiConversations, 
  useCreateOpenaiConversation, 
  useDeleteOpenaiConversation,
  useListOpenaiMessages,
  getListOpenaiConversationsQueryKey,
  getListOpenaiMessagesQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Plus, MessageSquare, Trash2, Loader2, Search, Edit2, X, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Chat() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: conversations, isLoading: isLoadingConvs } = useListOpenaiConversations(
    { userId }, 
    { query: { queryKey: getListOpenaiConversationsQueryKey({ userId }), enabled: !!userId } }
  );

  const { data: messagesHistory, isLoading: isLoadingMessages } = useListOpenaiMessages(
    activeConvId!, 
    { query: { queryKey: getListOpenaiMessagesQueryKey(activeConvId!), enabled: !!activeConvId } }
  );

  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  const filteredConvs = conversations?.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = () => {
    createConv.mutate({ data: { userId, title: 'New Conversation' } }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey({ userId }) });
        setActiveConvId(data.id);
      }
    });
  };

  const handleDeleteChat = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey({ userId }) });
        if (activeConvId === id) setActiveConvId(null);
      }
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesHistory, streamingMessage]);

  useEffect(() => {
    if (activeConvId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeConvId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConvId || isStreaming) return;

    const messageContent = input;
    setInput('');
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const response = await fetch(`/api/openai/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: messageContent })
      });

      if (!response.body) throw new Error('No body in response');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                streamText += data.content;
                setStreamingMessage(streamText);
              }
            } catch {
              // ignore parse errors on incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(activeConvId!) });
    }
  };

  const startRename = (conv: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(conv.id);
    setRenameValue(conv.title);
  };

  const commitRename = (id: number) => {
    // Optimistic update in cache — no dedicated rename endpoint, so just update locally
    queryClient.setQueryData(getListOpenaiConversationsQueryKey({ userId }), (old: any) =>
      old ? old.map((c: any) => c.id === id ? { ...c, title: renameValue || c.title } : c) : old
    );
    setRenamingId(null);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[100dvh] w-full bg-background overflow-hidden">
      
      {/* Conversations Sidebar */}
      <div className="w-72 border-r border-white/5 bg-sidebar flex-col hidden md:flex shrink-0">
        <div className="p-3 border-b border-white/5 space-y-3">
          <button 
            onClick={handleNewChat}
            disabled={createConv.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/20 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {createConv.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            New Conversation
          </button>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 no-scrollbar">
          {isLoadingConvs ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" size={18} /></div>
          ) : filteredConvs?.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs p-4">
              {search ? 'No conversations match.' : 'No conversations yet.'}
            </div>
          ) : (
            filteredConvs?.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                  activeConvId === conv.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-muted-foreground'
                }`}
              >
                <MessageSquare size={13} className={`shrink-0 ${activeConvId === conv.id ? 'text-primary' : ''}`} />
                {renamingId === conv.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(conv.id); if (e.key === 'Escape') setRenamingId(null); }}
                    onBlur={() => commitRename(conv.id)}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 bg-white/10 rounded-md px-1.5 py-0.5 text-xs text-white outline-none border border-white/20"
                  />
                ) : (
                  <span className="flex-1 text-xs font-medium truncate">{conv.title}</span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => startRename(conv, e)}
                    className="p-1 hover:text-white transition-colors"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteChat(conv.id, e)}
                    className="p-1 hover:text-destructive transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: '#0d0d0f' }}>
        {/* WebGL shader orb — very subtle purple watermark */}
        <ShaderBackground className="absolute inset-0 opacity-[0.18] pointer-events-none" />

        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
            {/* ELLA orb */}
            <div className="relative mb-8">
              <motion.div
                className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
                animate={{ boxShadow: ['0 0 20px rgba(99,102,241,0.2)', '0 0 40px rgba(99,102,241,0.4)', '0 0 20px rgba(99,102,241,0.2)'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-primary"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>
            <h2 className="font-serif text-3xl mb-3 text-white">Speak with ELLA</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              Start a new conversation or select an existing one. ELLA remembers your context across sessions.
            </p>
            <button 
              onClick={handleNewChat}
              disabled={createConv.isPending}
              className="mt-8 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-primary/90 transition-colors"
            >
              {createConv.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-5 relative z-10 no-scrollbar">
              {isLoadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {messagesHistory?.map((msg, i) => (
                      <motion.div 
                        key={msg.id || `msg-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[70%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          {/* Avatar */}
                          {msg.role !== 'user' && (
                            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center mt-1">
                              <motion.div
                                className="w-1.5 h-1.5 rounded-full bg-primary"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className={`py-3 px-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                              : 'glass-card text-foreground rounded-tl-sm prose prose-invert prose-sm max-w-none'
                          }`}>
                            {msg.role === 'user' ? (
                              <span>{msg.content}</span>
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Streaming Message */}
                  {isStreaming && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] md:max-w-[70%] flex gap-3 flex-row">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center mt-1">
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        </div>
                        <div className="py-3 px-4 rounded-2xl text-sm leading-relaxed glass-card text-foreground rounded-tl-sm prose prose-invert prose-sm max-w-none">
                          {streamingMessage ? (
                            <>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingMessage}</ReactMarkdown>
                              <span className="inline-block w-1 h-4 ml-0.5 bg-primary/70 animate-pulse align-middle rounded-sm" />
                            </>
                          ) : (
                            <div className="flex gap-1 items-center py-1">
                              {[0, 0.15, 0.3].map(delay => (
                                <motion.div
                                  key={delay}
                                  className="w-1.5 h-1.5 rounded-full bg-primary/60"
                                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                                  transition={{ duration: 0.8, repeat: Infinity, delay }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} className="h-2" />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-5 relative z-10" style={{ background: 'linear-gradient(to top, #0d0d0f 60%, transparent)' }}>
              <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell ELLA what's on your mind..."
                  disabled={isStreaming}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/8 transition-all disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-30 disabled:bg-white/10 transition-all hover:bg-primary/90"
                >
                  <Send size={14} className="translate-x-0.5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
