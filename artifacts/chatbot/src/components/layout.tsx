import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  BookOpen, 
  CheckSquare, 
  Target, 
  Calendar as CalendarIcon, 
  Smile, 
  Wind,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Link } from 'wouter';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  useEffect(() => {
    if (!user && location !== '/login') {
      // Redirect handled by specific pages or a router wrapper ideally, 
      // but we do a quick check here. We'll rely on the App.tsx for true redirects.
    }
  }, [user, location]);

  const navItems = [
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Journal', path: '/journal', icon: BookOpen },
    { name: 'Habits', path: '/habits', icon: CheckSquare },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
    { name: 'Mood', path: '/mood', icon: Smile },
    { name: 'Meditation', path: '/meditation', icon: Wind },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh] w-full bg-background dark text-foreground selection:bg-primary/30">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-nav px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="font-serif text-2xl tracking-wide text-white">ELLA</Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -mr-2 text-muted-foreground hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-64 glass-nav border-r border-white/5
        flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 pb-2 hidden md:block">
          <Link href="/dashboard" className="font-serif text-3xl tracking-wide text-white cursor-pointer hover:text-primary transition-colors">
            ELLA
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 mt-16 md:mt-0 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <div 
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer group
                    ${isActive 
                      ? 'bg-primary/10 text-primary liquid-glass' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={18} className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground transition-colors'} />
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5">
            <div className="flex items-center gap-3 truncate">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-serif text-lg shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate">{user.username}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] pt-16 md:pt-0 w-full overflow-x-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex-1 w-full flex flex-col"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
