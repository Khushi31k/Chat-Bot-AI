import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useListMeditationPresets } from '@workspace/api-client-react';
import { Play, Wind, X, Loader2, Wand2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export default function Meditation() {
  const { user } = useAuth();
  const userId = user?.userId || 0;

  const { data: presets, isLoading } = useListMeditationPresets();

  const [activeSession, setActiveSession] = useState<{title: string, script?: string, duration: number} | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Custom generation state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [theme, setTheme] = useState('Anxiety relief');
  const [duration, setDuration] = useState(5);
  const [mood, setMood] = useState('Neutral');
  
  // SSE streaming & Speech state
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0 && !isGenerating) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            window.speechSynthesis.cancel();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, isGenerating]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleStartPreset = (preset: any) => {
    setActiveSession({ title: preset.title, duration: preset.duration * 60 });
    setTimeLeft(preset.duration * 60);
    setIsPlaying(true);
    // Note: Presets don't have scripts in the API return usually, so we just show the breathing animation.
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerateOpen(false);
    setIsGenerating(true);
    setIsPlaying(false);
    setStreamedText('');
    window.speechSynthesis.cancel();
    
    setActiveSession({ title: `Personalized: ${theme}`, duration: duration * 60 });
    setTimeLeft(duration * 60);

    try {
      const response = await fetch('/api/meditation/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, theme, duration, mood })
      });

      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

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
                fullText += data.content;
                setStreamedText(fullText);
              }
              if (data.done) {
                setIsGenerating(false);
                setIsPlaying(true);
                speak(fullText);
                break;
              }
            } catch (err) {}
          }
        }
      }
    } catch (error) {
      console.error(error);
      setIsGenerating(false);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // Slow, calm
    utterance.pitch = 0.9;
    speechUtteranceRef.current = utterance;
    
    // Find a good voice (preferably female/calm, but depends on OS)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google US English') || v.lang === 'en-US');
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const closeSession = () => {
    setActiveSession(null);
    setIsPlaying(false);
    setIsGenerating(false);
    window.speechSynthesis.cancel();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
        <div>
          <h1 className="font-serif text-4xl text-white mb-2">Meditation</h1>
          <p className="text-muted-foreground">Find your center.</p>
        </div>
        
        <Dialog.Root open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <Dialog.Trigger asChild>
            <button className="bg-primary/20 text-primary border border-primary/30 px-6 py-2.5 rounded-full font-medium hover:bg-primary/30 transition-colors flex items-center gap-2 w-max">
              <Wand2 size={16} /> Generate Personalized
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md z-50" />
            <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[#0a0a0f] border border-white/10 rounded-3xl p-8 w-[90vw] max-w-md z-50 shadow-2xl">
              <Dialog.Title className="font-serif text-3xl mb-6 text-white text-center">AI Meditation</Dialog.Title>
              
              <form onSubmit={handleGenerate} className="space-y-5">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">What do you need right now?</label>
                  <input
                    type="text"
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    placeholder="e.g. Anxiety relief before a meeting"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Current Mood</label>
                  <input
                    type="text"
                    value={mood}
                    onChange={e => setMood(e.target.value)}
                    placeholder="e.g. Stressed, Tired, Excited"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Duration (minutes): {duration}</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={!theme.trim()}
                  className="w-full bg-primary text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 mt-8 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                >
                  Generate & Begin
                </button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets?.map((preset) => (
            <div 
              key={preset.id}
              className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => handleStartPreset(preset)}
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-white text-6xl">
                {preset.icon}
              </div>
              <div className="text-3xl mb-4">{preset.icon}</div>
              <h3 className="font-serif text-2xl text-white mb-2">{preset.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{preset.description}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full text-white">
                  {preset.duration} min
                </span>
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <Play size={16} className="ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player Overlay */}
      <AnimatePresence>
        {activeSession && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]"
          >
            {/* Ambient Background */}
            <motion.div 
              className="absolute inset-0 bg-primary/10"
              animate={{ 
                opacity: isPlaying && !isGenerating ? [0.1, 0.3, 0.1] : 0.1
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            <button 
              onClick={closeSession}
              className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="relative z-10 flex flex-col items-center max-w-2xl text-center px-6 w-full">
              <h2 className="font-serif text-4xl text-white mb-12">{activeSession.title}</h2>
              
              {/* Breathing Circle */}
              <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
                <motion.div 
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                  animate={
                    isGenerating ? { scale: [1, 1.05, 1], rotate: 360 } :
                    isPlaying ? { scale: [1, 1.5, 1] } : { scale: 1 }
                  }
                  transition={
                    isGenerating ? { duration: 2, repeat: Infinity, ease: "linear" } :
                    isPlaying ? { duration: 8, repeat: Infinity, ease: "easeInOut" } : {}
                  }
                />
                <motion.div 
                  className="absolute inset-4 rounded-full bg-primary/20 blur-md"
                  animate={
                    isPlaying && !isGenerating ? { scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] } : { scale: 1 }
                  }
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative z-10 flex flex-col items-center text-primary">
                  {isGenerating ? (
                    <Loader2 size={40} className="animate-spin text-primary/50" />
                  ) : (
                    <>
                      <Wind size={40} className="mb-2 opacity-50" />
                      <span className="font-serif text-5xl">{formatTime(timeLeft)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Streaming Text */}
              <div className="h-32 w-full flex items-center justify-center">
                {isGenerating ? (
                  <p className="text-primary animate-pulse text-lg">ELLA is composing your meditation...</p>
                ) : streamedText ? (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl md:text-2xl text-white/80 leading-relaxed font-serif italic"
                  >
                    "{streamedText.split('. ').pop()}"
                  </motion.p>
                ) : (
                  <p className="text-white/40 text-lg">Focus on your breath.</p>
                )}
              </div>

              {/* Controls */}
              {!isGenerating && (
                <div className="mt-8">
                  <button 
                    onClick={() => {
                      setIsPlaying(!isPlaying);
                      if (isPlaying) {
                        window.speechSynthesis.pause();
                      } else {
                        window.speechSynthesis.resume();
                      }
                    }}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <span className="w-5 h-5 bg-black rounded-sm" /> : <Play size={24} className="ml-1" />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
