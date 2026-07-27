import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout';

// Page imports
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Chat from '@/pages/chat';
import Journal from '@/pages/journal';
import Habits from '@/pages/habits';
import Goals from '@/pages/goals';
import Calendar from '@/pages/calendar';
import Mood from '@/pages/mood';
import Meditation from '@/pages/meditation';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route path="/login" component={Login} />
      
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/chat"><ProtectedRoute component={Chat} /></Route>
      <Route path="/journal"><ProtectedRoute component={Journal} /></Route>
      <Route path="/habits"><ProtectedRoute component={Habits} /></Route>
      <Route path="/goals"><ProtectedRoute component={Goals} /></Route>
      <Route path="/calendar"><ProtectedRoute component={Calendar} /></Route>
      <Route path="/mood"><ProtectedRoute component={Mood} /></Route>
      <Route path="/meditation"><ProtectedRoute component={Meditation} /></Route>

      <Route>
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-serif text-2xl">
          404 | Not Found
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <div className="dark">
              <Router />
            </div>
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
