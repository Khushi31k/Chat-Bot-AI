import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShaderBackground } from '@/components/ui/electric-aura';
import { useLogin, useRegister } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function FloatingLabelInput({ label, type, value, onChange, required, minLength, placeholder }: any) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const float = focused || hasValue;
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        minLength={minLength}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 pt-6 pb-2 text-white 
                   focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all peer"
      />
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none
        ${float ? 'top-2 text-[10px] text-primary/70 font-medium tracking-wide uppercase' : 'top-4 text-sm text-muted-foreground'}`}>
        {label}
      </label>
    </div>
  );
}

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    if (isLogin) {
      loginMutation.mutate({ data: { username, password } }, {
        onSuccess: (data) => {
          login({ userId: data.userId, username: data.username });
        },
        onError: (err: any) => {
          toast({
            title: "Login failed",
            description: err.error || "Please check your credentials",
            variant: "destructive"
          });
        }
      });
    } else {
      registerMutation.mutate({ data: { username, password } }, {
        onSuccess: (data) => {
          login({ userId: data.userId, username: data.username });
        },
        onError: (err: any) => {
          toast({
            title: "Registration failed",
            description: err.error || "Username might be taken",
            variant: "destructive"
          });
        }
      });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden text-foreground">
      
      {/* WebGL shader orb — very subtle purple watermark */}
      <ShaderBackground className="absolute inset-0 opacity-[0.22] pointer-events-none" />

      <div className="w-full max-w-md p-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-6xl tracking-widest mb-4">ELLA</h1>
          <p className="text-muted-foreground text-sm tracking-wide">
            An AI companion that remembers, plans, and grows with you.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="glass-card rounded-3xl p-8"
        >
          <div className="flex gap-4 mb-8 p-1 rounded-full bg-white/5 backdrop-blur-md">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all duration-300 ${!isLogin ? 'bg-white/10 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FloatingLabelInput
              label="Username"
              type="text"
              value={username}
              onChange={(e: any) => setUsername(e.target.value)}
              required
              minLength={3}
            />
            <FloatingLabelInput
              label="Password"
              type="password"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              required
              minLength={4}
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-6 bg-primary text-primary-foreground rounded-2xl py-3 font-medium hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={18} className="animate-spin" />}
              {isLogin ? 'Enter' : 'Begin'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
