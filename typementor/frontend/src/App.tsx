import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from './store/AuthStore';
import AppRoutes from './AppRoutes';
import { Brain, Loader2 } from 'lucide-react';
import { trackPageView } from './utils/monitoring';

const SLOW_THRESHOLD_MS = 4000; // Show "server waking up" hint after 4s

export default function App() {
  const { isBootstrapping, bootstrap } = useAuthStore();
  const location = useLocation();
  const [isSlowStart, setIsSlowStart] = useState(false);

  // On mount: validate stored token before rendering anything
  useEffect(() => {
    bootstrap();

    // If bootstrap takes > 4s, show a friendly "server is waking up" hint
    const timer = setTimeout(() => setIsSlowStart(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  // ── Keep-Alive ping every 13 minutes to prevent Render cold starts ──────────
  useEffect(() => {
    const PING_INTERVAL = 13 * 60 * 1000; // 13 minutes
    const ping = () => {
      fetch('https://typementor-backend1.onrender.com/health', { method: 'GET' }).catch(() => {});
    };
    const interval = setInterval(ping, PING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // If bootstrapping, show a full-screen loading spinner
  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4">
        <div className="bg-brand-primary p-3 rounded-2xl text-white shadow-lg shadow-brand-primary/30 animate-pulse">
          <Brain className="w-8 h-8" />
        </div>
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        <p className="text-xs text-brand-muted uppercase tracking-widest font-semibold">
          {isSlowStart ? 'Waking up server…' : 'Loading TypeMentor AI…'}
        </p>
        {isSlowStart && (
          <p className="text-[11px] text-brand-muted max-w-xs text-center leading-relaxed mt-1 opacity-70">
            The server is starting up from sleep. This takes about 30 seconds and only happens once.
          </p>
        )}
      </div>
    );
  }

  // Once bootstrap completes, hand off routing to AppRoutes
  return <AppRoutes />;
}
