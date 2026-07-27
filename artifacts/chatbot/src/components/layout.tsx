import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
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
  X,
  Brain,
  Sparkles,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link } from 'wouter';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('ella-sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ella-sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Journal', path: '/journal', icon: BookOpen },
    { name: 'Goals', path: '/goals', icon: Target },
    { name: 'Habits', path: '/habits', icon: CheckSquare },
    { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
    { name: 'Mood', path: '/mood', icon: Smile },
    { name: 'Meditation', path: '/meditation', icon: Wind },
    { name: 'Insights', path: '/insights', icon: Sparkles },
  ];

  const bottomItems = [
    { name: 'Memory', path: '/memory', icon: Brain },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (!user) return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh] w-full bg-background dark text-foreground selection:bg-primary/30">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-nav px-4 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="font-serif text-2xl tracking-widest text-white">ELLA</Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -mr-2 text-muted-foreground hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-[100dvh] glass-nav border-r border-white/5
        flex flex-col transition-all duration-300 ease-in-out shrink-0
        ${isCollapsed ? 'md:w-[68px]' : 'md:w-64'} w-64
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className={`p-6 pb-4 hidden md:flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
          <Link href="/dashboard" className={`font-serif tracking-widest text-white cursor-pointer hover:text-primary transition-colors ${isCollapsed ? 'text-xl' : 'text-3xl'}`} title="ELLA">
            {isCollapsed ? 'E' : 'ELLA'}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 mt-16 md:mt-0 space-y-0.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== '/dashboard' && location.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <div 
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group relative
                    ${isCollapsed ? 'justify-center px-0' : 'gap-3'}
                    ${isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }
                  `}
                >
                  <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground transition-colors shrink-0'} />
                  {!isCollapsed && <span className={`text-sm ${isActive ? 'font-medium' : 'font-normal'}`}>{item.name}</span>}
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                    />
                  )}
                  {isActive && isCollapsed && (
                    <motion.div
                      layoutId="nav-indicator-collapsed"
                      className="absolute left-1 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-2 space-y-0.5 border-t border-white/5 pt-2 relative">
          {/* Collapse Toggle */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex absolute -top-3 right-[-12px] w-6 h-6 rounded-full bg-white/10 border border-white/10 items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all shadow-lg z-50"
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>

          {bottomItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div title={isCollapsed ? item.name : undefined} className={`flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group
                  ${isCollapsed ? 'justify-center px-0' : 'gap-3'}
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}
                `}>
                  <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground transition-colors shrink-0'} />
                  {!isCollapsed && <span className="text-sm font-normal">{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-white/5">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4 py-3'} rounded-xl bg-white/5`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'p-2' : 'truncate'}`}>
              <div title={isCollapsed ? `Logged in as ${user.username}` : undefined} className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-serif text-sm shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && <span className="text-sm font-medium truncate text-white/80">{user.username}</span>}
            </div>
            {!isCollapsed && (
              <button 
                onClick={logout}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button 
              onClick={logout}
              className="mt-2 w-full p-2 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-white/5 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-[100dvh] pt-16 md:pt-0 w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-1 w-full flex flex-col"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
