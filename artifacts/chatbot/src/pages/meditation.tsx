import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useListMeditationPresets } from '@workspace/api-client-react';
import { Play, Pause, Wind, X, Loader2, Wand2, SkipBack } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const THEMES = ['Anxiety relief', 'Morning focus', 'Deep sleep', 'Gratitude', 'Confidence', 'Stress release'];
const MOODS_LIST = ['Anxious', 'Tired', 'Restless', 'Neutral', 'Calm', 'Energetic'];
const DURATIONS = [3, 5, 10, 15];

// Breathing circle animation phases
const BREATHING = [
  { label: 'Breathe in', duration: 4 },
  { label: 'Hold', duration: 4 },
  { label: 'Breathe out', duration: 6 },
  { label: 'Hold', duration: 2 },
];

function BreathingRing({ isPlaying }: { isPlaying: boolean }) {
  const [phase, setPhase] = useState(0);
  const [label, setLabel] = useState('Breathe in');

  useEffect(() => {
    if (!isPlaying) return;
    let idx = 0;
    const advance = () => {
      setPhase(idx % 4);
      setLabel(BREATHING[idx % 4].label);
      idx++;
    };
    advance();
    const total = BREATHING.reduce((a, b) => a + b.duration, 0) * 1000;
    let elapsed = 0;
    const intervals = BREATHING.map((b, i) => {
      const delay = setTimeout(() => { }, 0); // placeholder
      return delay;
    });

    // Cycle through phases
    const cycle = () => {
      let delay = 0;
      BREATHING.forEach((b, i) => {
        setTimeout(() => {
          if (isPlaying) {
            setPhase(i);
            setLabel(b.label);
          }
        }, delay);
        delay += b.duration * 1000;
      });
    };

    cycle();
    const cycleInterval = setInterval(cycle, BREATHING.reduce((a, b) => a + b.duration, 0) * 1000);

    return () => clearInterval(cycleInterval);
  }, [isPlaying]);

  const isExpanding = phase === 0;
  const isContracting = phase === 2;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/5"
        animate={isPlaying ? {
          scale: isExpanding ? [1, 1.4] : isContracting ? [1.4, 1] : undefined,
        } : { scale: 1 }}
        transition={{ duration: isExpanding ? 4 : isContracting ? 6 : 0, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-4 rounded-full bg-primary/10 border border-primary/20"
        animate={isPlaying ? {
          scale: isExpanding ? [1, 1.3] : isContracting ? [1.3, 1] : undefined,
          boxShadow: isPlaying ? ['0 0 20px rgba(99,102,241,0.2)', '0 0 40px rgba(99,102,241,0.5)', '0 0 20px rgba(99,102,241,0.2)'] : undefined,
        } : { scale: 1 }}
        transition={{ duration: isExpanding ? 4 : isContracting ? 6 : 0, ease: 'easeInOut' }}
      />
      <div className="relative z-10 text-center">
        <motion.div
          className="w-4 h-4 rounded-full bg-primary mx-auto mb-2"
          animate={{ opacity: isPlaying ? [0.5, 1, 0.5] : 0.3 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {isPlaying && (
          <p className="text-xs text-white/50">{label}</p>
        )}
      </div>
    </div>
  );
}

export default function Meditation() {
  const { user } = useAuth();
  const userId = user?.userId || 0;

  const { data: presets, isLoading } = useListMeditationPresets();

  const [activeSession, setActiveSession] = useState<{ title: string; duration: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [theme, setTheme] = useState(THEMES[0]);
  const [duration, setDuration] = useState(5);
  const [mood, setMood] = useState(MOODS_LIST[3]);
  const [isGenerating, setIsGenerating] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioBlobUrlRef.current) URL.revokeObjectURL(audioBlobUrlRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const loadAudio = async (theme: string, durationMin: number, mood?: string) => {
    setIsLoadingAudio(true);
    try {
      // Clean up previous
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }

      const body = { userId, theme, duration: durationMin, ...(mood ? { mood } : {}) };

      const res = await fetch('/api/meditation/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Audio generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioBlobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        setTotalDuration(audio.duration);
      });
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('Audio error:', err);
      // Fall back to timer-only mode
      setIsPlaying(true);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStartPreset = async (preset: any) => {
    setActiveSession({ title: preset.title, duration: preset.duration * 60 });
    setCurrentTime(0);
    setTotalDuration(preset.duration * 60);
    setIsPlaying(false);
    await loadAudio(preset.theme ?? preset.title, preset.duration);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerateOpen(false);
    setIsGenerating(true);
    setActiveSession({ title: `${theme} · ${duration} min`, duration: duration * 60 });
    setCurrentTime(0);
    setTotalDuration(duration * 60);
    setIsPlaying(false);
    await loadAudio(theme, duration, mood || undefined);
    setIsGenerating(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      setIsPlaying(p => !p);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const duration_total = totalDuration || activeSession?.duration || 0;
  const remaining = Math.max(0, duration_total - currentTime);
  const progress = duration_total > 0 ? (currentTime / duration_total) * 100 : 0;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full flex flex-col min-h-[calc(100dvh-4rem)] md:min-h-[100dvh]">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-start justify-between mb-10"
      >
        <div>
          <h1 className="font-serif text-5xl text-white mb-2">Meditation</h1>
          <p className="text-muted-foreground text-sm">Find stillness in the moment.</p>
        </div>
        <button
          onClick={() => setIsGenerateOpen(true)}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium px-4 py-2.5 rounded-2xl transition-colors"
        >
          <Wand2 size={15} /> Personalise
        </button>
      </motion.div>

      {/* Presets Grid */}
      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
          {presets?.map((preset, i) => (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleStartPreset(preset)}
              className="glass-card rounded-3xl p-6 text-left border border-white/5 hover:border-white/15 transition-all group relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-primary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Wind size={18} className="text-primary/70" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Play size={12} className="text-white/50 group-hover:text-primary transition-colors ml-0.5" />
                  </div>
                </div>
                <h3 className="font-serif text-xl text-white mb-1">{preset.title}</h3>
                {preset.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{preset.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/5 text-white/50 px-2.5 py-1 rounded-full">{preset.duration} min</span>
                  {preset.theme && (
                    <span className="text-xs bg-primary/10 text-primary/70 px-2.5 py-1 rounded-full">{preset.theme}</span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Player Modal */}
      <AnimatePresence>
        {activeSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md glass-card rounded-3xl p-8 border border-white/10 flex flex-col items-center text-center relative"
            >
              <button
                onClick={() => { setActiveSession(null); audioRef.current?.pause(); setIsPlaying(false); }}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
              >
                <X size={15} />
              </button>

              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Now playing</p>
              <h2 className="font-serif text-2xl text-white mb-8">{activeSession.title}</h2>

              {/* Breathing Ring */}
              <div className="mb-8">
                {isLoadingAudio || isGenerating ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 size={28} className="animate-spin text-primary mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground">Generating audio...</p>
                    </div>
                  </div>
                ) : (
                  <BreathingRing isPlaying={isPlaying} />
                )}
              </div>

              {/* Progress */}
              <div className="w-full mb-6">
                <input
                  type="range"
                  min="0"
                  max={duration_total || 1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>-{formatTime(remaining)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleRestart}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                  <SkipBack size={16} />
                </button>
                <button
                  onClick={togglePlay}
                  disabled={isLoadingAudio || isGenerating}
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  {isPlaying ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} className="ml-0.5" />
                  )}
                </button>
                <div className="w-10 h-10" /> {/* spacer */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Dialog */}
      <Dialog.Root open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-[#0d0d0f] border border-white/10 rounded-3xl p-6 w-[90vw] max-w-md z-50 shadow-2xl focus:outline-none">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="font-serif text-2xl text-white">Personalise session</Dialog.Title>
              <Dialog.Close className="text-muted-foreground hover:text-white transition-colors">
                <X size={18} />
              </Dialog.Close>
            </div>
            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Theme</label>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map(t => (
                    <button key={t} type="button" onClick={() => setTheme(t)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${theme === t ? 'bg-primary text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} type="button" onClick={() => setDuration(d)}
                      className={`flex-1 py-2 rounded-xl text-sm transition-colors ${duration === d ? 'bg-primary text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Current mood</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS_LIST.map(m => (
                    <button key={m} type="button" onClick={() => setMood(m)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${mood === m ? 'bg-primary text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit"
                className="w-full bg-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
                <Wand2 size={15} /> Generate Session
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
