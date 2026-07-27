import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon, Volume2, Brain, Download, Trash2, ChevronRight, Moon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VOICES = [
  { id: 'nova', label: 'Nova', description: 'Warm and expressive' },
  { id: 'alloy', label: 'Alloy', description: 'Neutral and clear' },
  { id: 'echo', label: 'Echo', description: 'Deep and resonant' },
  { id: 'shimmer', label: 'Shimmer', description: 'Soft and gentle' },
];

const PERSONALITIES = [
  { id: 'companion', label: 'Companion', description: 'Warm, empathetic, supportive' },
  { id: 'coach', label: 'Coach', description: 'Motivating, direct, action-oriented' },
  { id: 'therapist', label: 'Therapist', description: 'Reflective, probing, insight-focused' },
];

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">{title}</h2>
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children, last = false }: {
  label: string;
  description?: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`px-5 py-4 flex items-center justify-between gap-4 ${!last ? 'border-b border-white/5' : ''}`}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [voice, setVoice] = useState(() => localStorage.getItem('ella_voice') || 'nova');
  const [personality, setPersonality] = useState(() => localStorage.getItem('ella_personality') || 'companion');
  const [streamResponse, setStreamResponse] = useState(() => localStorage.getItem('ella_stream') !== 'false');

  const saveVoice = (v: string) => {
    setVoice(v);
    localStorage.setItem('ella_voice', v);
    toast({ title: 'Voice updated', duration: 2000 });
  };

  const savePersonality = (p: string) => {
    setPersonality(p);
    localStorage.setItem('ella_personality', p);
    toast({ title: 'Personality updated', duration: 2000 });
  };

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      user: { username: user?.username },
      note: 'Full data export coming soon — this is a placeholder.',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ella-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Export started', duration: 2000 });
  };

  const handleDelete = () => {
    if (!confirm('Are you sure? This will log you out and cannot be undone.')) return;
    logout();
    toast({ title: 'Account removed', variant: 'destructive' });
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto w-full">

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
            <SettingsIcon size={18} className="text-muted-foreground" />
          </div>
          <h1 className="font-serif text-4xl text-white">Settings</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-13">Configure your ELLA experience.</p>
      </motion.div>

      {/* Profile */}
      <SettingSection title="Account">
        <SettingRow label="Username" last>
          <span className="text-sm text-muted-foreground font-medium">{user?.username}</span>
        </SettingRow>
      </SettingSection>

      {/* Appearance */}
      <SettingSection title="Appearance">
        <SettingRow label="Theme" description="Dark mode is always on — it's part of the experience" last>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Moon size={14} />
            <span>Dark</span>
          </div>
        </SettingRow>
      </SettingSection>

      {/* Voice */}
      <SettingSection title="Voice">
        {VOICES.map((v, i) => (
          <SettingRow key={v.id} label={v.label} description={v.description} last={i === VOICES.length - 1}>
            <button
              onClick={() => saveVoice(v.id)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${voice === v.id ? 'bg-primary border-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'border-white/20 hover:border-white/40'}`}
            />
          </SettingRow>
        ))}
      </SettingSection>

      {/* AI Personality */}
      <SettingSection title="AI Personality">
        {PERSONALITIES.map((p, i) => (
          <SettingRow key={p.id} label={p.label} description={p.description} last={i === PERSONALITIES.length - 1}>
            <button
              onClick={() => savePersonality(p.id)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${personality === p.id ? 'bg-primary border-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'border-white/20 hover:border-white/40'}`}
            />
          </SettingRow>
        ))}
      </SettingSection>

      {/* AI Behavior */}
      <SettingSection title="AI Behavior">
        <SettingRow label="Streaming responses" description="See ELLA's response appear word by word" last>
          <button
            onClick={() => {
              const next = !streamResponse;
              setStreamResponse(next);
              localStorage.setItem('ella_stream', String(next));
              toast({ title: next ? 'Streaming enabled' : 'Streaming disabled', duration: 2000 });
            }}
            className={`w-10 h-6 rounded-full transition-colors relative ${streamResponse ? 'bg-primary' : 'bg-white/10'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${streamResponse ? 'left-4.5' : 'left-0.5'}`} />
          </button>
        </SettingRow>
      </SettingSection>

      {/* Data */}
      <SettingSection title="Your Data">
        <SettingRow label="Export data" description="Download a copy of all your ELLA data">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            <Download size={14} /> Export
          </button>
        </SettingRow>
        <SettingRow label="Sign out" last>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors font-medium"
          >
            Sign out <ChevronRight size={14} />
          </button>
        </SettingRow>
      </SettingSection>

      {/* Danger Zone */}
      <SettingSection title="Danger Zone">
        <SettingRow label="Delete account" description="Remove all your data permanently" last>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors font-medium"
          >
            <Trash2 size={14} /> Delete
          </button>
        </SettingRow>
      </SettingSection>

      <div className="text-center pt-4 pb-10">
        <p className="text-xs text-white/10 font-serif tracking-widest">ELLA — your private AI companion</p>
      </div>
    </div>
  );
}
