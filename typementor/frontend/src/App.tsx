import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from './store/AuthStore';
import AppRoutes from './AppRoutes';
import { Brain, Loader2 } from 'lucide-react';
import { trackPageView } from './utils/monitoring';

export default function App() {
  const { isBootstrapping, bootstrap } = useAuthStore();
  const location = useLocation();

  // On mount: validate stored token before rendering anything
  useEffect(() => {
    bootstrap();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // If bootstrapping, show a full-screen loading spinner
  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <div className="bg-brand-primary p-3 rounded-2xl text-white shadow-lg shadow-brand-primary/30 animate-pulse">
          <Brain className="w-8 h-8" />
        </div>
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        <p className="text-xs text-brand-muted uppercase tracking-widest font-semibold">
          Loading TypeMentor AI…
        </p>
      </div>
    );
  }

  // Once bootstrap completes, hand off routing to AppRoutes
  return <AppRoutes />;
}
