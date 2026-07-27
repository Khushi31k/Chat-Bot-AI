import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useListOpenaiConversations, 
  useCreateOpenaiConversation, 
  useDeleteOpenaiConversation,
  useListOpenaiMessages,
  OpenaiMessage,
  getListOpenaiConversationsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';

export default function Chat() {
  const { user } = useAuth();
  const userId = user?.userId || 0;
  const queryClient = useQueryClient();
  
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: isLoadingConvs } = useListOpenaiConversations(
    { userId }, 
    { query: { enabled: !!userId } }
  );

  const { data: messagesHistory, isLoading: isLoadingMessages } = useListOpenaiMessages(
    activeConvId!, 
    { query: { enabled: !!activeConvId } }
  );

  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

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
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey({ userId }) });
        if (activeConvId === id) setActiveConvId(null);
      }
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesHistory, streamingMessage]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConvId || isStreaming) return;

    const messageContent = input;
    setInput('');
    setIsStreaming(true);
    setStreamingMessage('');

    // Optimistically add user message (handled by refetch later, but we could do manual cache update)
    // For simplicity and safety during stream, we rely on the API to return the full history later.
    // However, it's nicer to see it instantly. 

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
              if (data.done) {
                break;
              }
            } catch (err) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/openai/conversations', activeConvId, 'messages'] });
    }
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[100dvh] w-full bg-background overflow-hidden">
      
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-white/5 bg-sidebar flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white/5">
          <button 
            onClick={handleNewChat}
            disabled={createConv.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:opacity-50"
          >
            {createConv.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            New Conversation
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {isLoadingConvs ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : conversations?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm p-4">No conversations yet.</div>
          ) : (
            conversations?.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                  activeConvId === conv.id ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <MessageSquare size={16} className={activeConvId === conv.id ? 'text-primary' : ''} />
                  <span className="text-sm font-medium truncate">{conv.title}</span>
                </div>
                <button 
                  onClick={(e) => handleDeleteChat(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#0a0a0f]">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <MessageSquare size={32} className="text-primary" />
            </div>
            <h2 className="font-serif text-3xl mb-2 text-white">Speak with ELLA</h2>
            <p className="text-muted-foreground max-w-md">
              Start a new conversation to organize your thoughts, ask for advice, or just reflect on your day.
            </p>
            <button 
              onClick={handleNewChat}
              className="mt-8 md:hidden flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium shadow-[0_0_15px_rgba(99,102,241,0.2)]"
            >
              <Plus size={16} /> New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative z-10 no-scrollbar">
              {isLoadingMessages ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {messagesHistory?.map((msg, i) => (
                      <motion.div 
                        key={msg.id || `msg-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] md:max-w-[70%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          
                          {/* Avatar */}
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
                            msg.role === 'user' 
                              ? 'bg-white/10 text-white text-xs font-medium' 
                              : 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                          }`}>
                            {msg.role === 'user' ? user?.username.charAt(0).toUpperCase() : <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                          </div>

                          {/* Message Bubble */}
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-[0_4px_20px_rgba(99,102,241,0.2)]' 
                              : 'glass-card text-foreground rounded-tl-sm'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Streaming Message */}
                  {isStreaming && streamingMessage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[85%] md:max-w-[70%] flex gap-4 flex-row">
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 bg-primary/20 text-primary shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        </div>
                        <div className="p-4 rounded-2xl text-sm leading-relaxed glass-card text-foreground rounded-tl-sm">
                          {streamingMessage}
                          <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-gradient-to-t from-[#0a0a0f] to-transparent relative z-10">
              <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell ELLA what's on your mind..."
                  disabled={isStreaming}
                  className="w-full bg-white/5 border border-white/10 rounded-full pl-6 pr-14 py-4 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white/10 transition-all shadow-lg disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isStreaming}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:bg-white/10 transition-colors"
                >
                  <Send size={16} className={input.trim() ? "translate-x-0.5" : ""} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
