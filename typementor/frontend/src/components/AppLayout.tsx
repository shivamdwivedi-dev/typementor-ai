import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { getStorageKey } from '../utils/api';
import { getLastActivity, getSmartResumeTarget, ResumeTarget, logResumeAnalytics } from '../utils/ResumeTracker';
import { registerToastListener, ToastMessage } from '../utils/toastHelper';
import { motion, AnimatePresence } from 'framer-motion';
import TubesBackground from './ui/neon-flow';

// Components
import SoundSettings from './SoundSettings';
import StreakFireWidget from './StreakFireWidget';
import XPProgressBar from './XPProgressBar';
import AchievementToast, { useAchievementToast } from './AchievementToast';
import MobileKeyboardWarning from './MobileKeyboardWarning';
import WelcomeBackCard from './WelcomeBackCard';
import BetaFeedback from './BetaFeedback';
import { Suspense, lazy } from 'react';
const AIGuide = lazy(() => import('./AIGuide'));

// Icons
import {
  Brain, Activity, User as UserIcon, Code, Award,
  LogOut, Flame, Menu, X, BookOpen, WifiOff, RefreshCw
} from 'lucide-react';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isOffline, logout, bootstrap } = useAuthStore();
  
  const [isGuestSession, setIsGuestSessionState] = useState(() => localStorage.getItem('typementor_is_guest') === 'true');
  const setIsGuestSession = (val: boolean) => {
    setIsGuestSessionState(val);
    if (val) localStorage.setItem('typementor_is_guest', 'true');
    else localStorage.removeItem('typementor_is_guest');
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [showTimeNudge, setShowTimeNudge] = useState(false);
  
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const hasShownWelcome = useRef(false);
  const { current: currentAchievement, addAchievement, dismiss: dismissAchievement } = useAchievementToast();

  // Clear guest session when authenticated
  useEffect(() => {
    if (isAuthenticated) setIsGuestSession(false);
  }, [isAuthenticated]);

  // Register local toast listener
  useEffect(() => {
    const unbind = registerToastListener((updated) => setToasts([...updated]));
    return unbind;
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile touch warning
  useEffect(() => {
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasTouch = navigator.maxTouchPoints > 0;
    const isTouchDevice = isMobileUserAgent || (hasTouch && window.innerWidth <= 1024);
    const isDismissed = sessionStorage.getItem('mobile_keyboard_warning_dismissed') === 'true';

    if (isTouchDevice && !isDismissed) setShowMobileWarning(true);
  }, []);

  // Session time tracker
  useEffect(() => {
    if (!isAuthenticated && !isGuestSession) return;
    const interval = setInterval(() => {
      setSessionMinutes(m => {
        const newM = m + 1;
        if (newM > 0 && newM % 30 === 0) {
          setShowTimeNudge(true);
          setTimeout(() => setShowTimeNudge(false), 5000);
        }
        return newM;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isGuestSession]);

  // Achievements
  useEffect(() => {
    const handleAchievement = (e: any) => { if (e.detail) addAchievement(e.detail); };
    window.addEventListener('typementor_achievement', handleAchievement);
    return () => window.removeEventListener('typementor_achievement', handleAchievement);
  }, [addAchievement]);

  // Welcome Back modal
  useEffect(() => {
    if ((isAuthenticated || isGuestSession) && !hasShownWelcome.current) {
      const lastAct = getLastActivity(user);
      if (lastAct) setShowWelcomeBack(true);
      hasShownWelcome.current = true;
    }
  }, [isAuthenticated, isGuestSession, user]);

  const handleLogout = () => {
    logout();
    setIsGuestSession(false);
    navigate('/');
  };

  const handleResumeJourney = (target: ResumeTarget) => {
    logResumeAnalytics('click');
    (window as any).__typementor_resumed = true;

    if (target.type === 'academy') {
      navigate('/academy');
      if (target.lessonId) {
        (window as any).__typementor_resume_lesson_id = target.lessonId;
        window.dispatchEvent(new CustomEvent('typementor_resume_lesson', { detail: { lessonId: target.lessonId } }));
      }
    } else if (target.type === 'recovery') {
      navigate('/practice', { state: { startRecovery: true } });
    } else if (target.type === 'endurance') {
      navigate('/endurance');
    } else {
      navigate('/practice');
    }
    setShowWelcomeBack(false);
  };

  const currentPage = location.pathname.substring(1) || 'practice';

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col font-sans select-none text-brand-text overflow-x-hidden">
      {/* Background Animated Tubes Canvas Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0 overflow-hidden">
        <TubesBackground enableClickInteraction={false} className="w-full h-full" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <AchievementToast achievement={currentAchievement} onDismiss={dismissAchievement} />

        {showTimeNudge && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-zinc-900/95 border border-blue-500/30 text-white text-xs font-semibold shadow-xl backdrop-blur-md animate-bounce">
            ⌨️ You've been practicing for {sessionMinutes} minutes! Amazing focus!
          </div>
        )}

        {showMobileWarning && <MobileKeyboardWarning onClose={() => setShowMobileWarning(false)} />}
        
        {isOffline && (
          <div className="bg-brand-warning/15 border-b border-brand-warning/45 text-brand-warning px-4 py-3 text-center text-xs flex flex-wrap items-center justify-center gap-3 animate-pulse shadow-lg z-50">
            <div className="flex items-center gap-2 font-extrabold uppercase tracking-wide">
              <WifiOff className="w-4 h-4 text-brand-warning" />
              <span>TypeMentor AI is Offline</span>
            </div>
            <p className="text-[11px] text-brand-muted max-w-xl text-left font-medium">
              The database/analytics server is unreachable. You can continue typing in guest mode (stored locally), but account sync and deep AI diagnostics require an active connection.
            </p>
            <button onClick={() => bootstrap()} className="flex items-center gap-1.5 px-3 py-1 rounded bg-brand-warning hover:bg-brand-warning/90 text-slate-950 font-bold transition-all text-[11px]">
              <RefreshCw className="w-3 h-3" /> Retry Connection
            </button>
          </div>
        )}

        <div className="fixed bottom-6 right-6 md:top-20 md:right-6 md:bottom-auto z-50 flex flex-col gap-2.5 max-w-md pointer-events-none w-[calc(100%-3rem)] md:w-96">
          {toasts.map((toast) => {
            let borderClass = 'border-brand-primary/60';
            let icon = '✨';
            if (toast.message.includes('LEVEL UP')) { borderClass = 'border-brand-warning/80 shadow-brand-warning/20'; icon = '🎉'; }
            else if (toast.message.includes('ACHIEVEMENT')) { borderClass = 'border-brand-success/80 shadow-brand-success/20'; icon = '🏆'; }
            else if (toast.message.includes('DAILY GOAL')) { borderClass = 'border-brand-warning/80 shadow-brand-warning/20'; icon = '🏅'; }
            else if (toast.message.includes('RECORD')) { borderClass = 'border-brand-primary/80 shadow-brand-primary/20'; icon = '👑'; }

            return (
              <div key={toast.id} className={`pointer-events-auto bg-zinc-950/90 backdrop-blur-md border ${borderClass} px-4 py-3.5 rounded-xl shadow-2xl text-white font-extrabold text-xs flex items-center gap-3 animate-in slide-in-from-right duration-300`}>
                <span className="text-xl flex-shrink-0 animate-bounce">{icon}</span>
                <span className="leading-snug text-left">{toast.message}</span>
              </div>
            );
          })}
        </div>

        <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-lg shadow-black/40">
          <Link to="/practice" className="flex items-center gap-3 cursor-pointer group">
            <motion.div 
              whileHover={{ scale: 1.08, rotate: 5 }}
              className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-600/30 border border-blue-400/30"
            >
              <Brain className="w-6 h-6" />
            </motion.div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                  TypeMentor <span className="text-blue-400 font-black px-1.5 py-0.5 rounded text-xs bg-blue-500/10 border border-blue-500/20">AI</span>
                </h1>
                {isOffline && (
                  <span className="bg-brand-warning/10 text-brand-warning border border-brand-warning/30 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded animate-pulse">
                    Offline Mode
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400 tracking-wider uppercase font-semibold">Adaptive Typing Coach</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1.5">
            <Link to="/academy" title="Typing Academy" className={`px-3.5 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${location.pathname === '/academy' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
              <BookOpen className="w-4 h-4 flex-shrink-0" /> <span className="hidden xl:inline">Academy</span>
            </Link>
            <Link to="/practice" title="Practice" className={`px-3.5 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${location.pathname === '/practice' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
              <Code className="w-4 h-4 flex-shrink-0" /> <span className="hidden xl:inline">Practice</span>
            </Link>

            {isAuthenticated && (
              <>
                <Link to="/endurance" title="Endurance Arena" className={`px-3.5 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${location.pathname === '/endurance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
                  <Activity className="w-4 h-4 flex-shrink-0" /> <span className="hidden xl:inline">Endurance</span>
                </Link>
                <Link to="/path" title="Learning Path" className={`px-3.5 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${location.pathname === '/path' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
                  <Award className="w-4 h-4 flex-shrink-0" /> <span className="hidden xl:inline">Path</span>
                </Link>
                <Link to="/dashboard" title="Dashboard" className={`px-3.5 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${location.pathname === '/dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
                  <Activity className="w-4 h-4 flex-shrink-0" /> <span className="hidden xl:inline">Stats</span>
                </Link>
                <Link to="/profile" title="Profile" className={`px-3.5 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${location.pathname === '/profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border border-blue-400/40' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
                  <UserIcon className="w-4 h-4 flex-shrink-0" /> <span className="hidden xl:inline">Profile</span>
                </Link>
              </>
            )}

            <SoundSettings />
            <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <StreakFireWidget streak={user?.streak ?? 0} />
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-blue-500/40 object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-black text-blue-400 flex-shrink-0">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button onClick={handleLogout} title="Sign Out" className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-red-400 flex-shrink-0">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              isGuestSession && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 font-semibold border border-zinc-800 px-2.5 py-1 rounded-lg bg-zinc-900/60">Guest</span>
                  <button onClick={handleLogout} title="Exit Guest" className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-red-500/10 transition-all text-red-400 flex-shrink-0">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
          </nav>

          <div className="flex lg:hidden items-center gap-2">
            {isAuthenticated && (
              <>
                <StreakFireWidget streak={user?.streak ?? 0} />
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full border border-blue-500/40 object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-[10px] font-black text-blue-400">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </>
            )}
            {(isAuthenticated || isGuestSession) && (
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 transition-all text-white focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}>
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </header>

        {isAuthenticated && user && <XPProgressBar xp={user.xp ?? 0} level={user.level ?? 1} />}

        {isMobileMenuOpen && (isAuthenticated || isGuestSession) && (
          <div className="fixed inset-0 z-40 md:hidden flex justify-end">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative w-72 max-w-[80vw] h-full bg-zinc-950/95 border-l border-zinc-800 p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 transform translate-x-0 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-white text-base">Menu</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {isAuthenticated && (
                <div className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-blue-500/40 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xs font-black text-blue-400">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Logged In As</span>
                      <span className="text-sm font-semibold text-white truncate max-w-[120px]">{user?.name}</span>
                    </div>
                  </div>
                  {(user?.streak ?? 0) > 0 && (
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">
                      <Flame className="w-3.5 h-3.5" /> {user?.streak}
                    </span>
                  )}
                </div>
              )}

              <nav className="flex flex-col gap-3.5">
                <div className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl flex items-center justify-between gap-2.5">
                  <span className="text-xs font-semibold text-zinc-400">Sound Effects</span>
                  <SoundSettings />
                </div>

                <Link onClick={() => setIsMobileMenuOpen(false)} to="/academy" className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 ${location.pathname === '/academy' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/40' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                  <BookOpen className="w-4 h-4" /> Typing Academy
                </Link>
                <Link onClick={() => setIsMobileMenuOpen(false)} to="/practice" className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 ${location.pathname === '/practice' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/40' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                  <Code className="w-4 h-4" /> Practice
                </Link>

                {isAuthenticated && (
                  <>
                    <Link onClick={() => setIsMobileMenuOpen(false)} to="/endurance" className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 ${location.pathname === '/endurance' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/40' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                      <Activity className="w-4 h-4" /> Endurance Arena
                    </Link>
                    <Link onClick={() => setIsMobileMenuOpen(false)} to="/path" className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 ${location.pathname === '/path' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/40' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                      <Award className="w-4 h-4" /> Learning Path
                    </Link>
                    <Link onClick={() => setIsMobileMenuOpen(false)} to="/dashboard" className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 ${location.pathname === '/dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/40' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                      <Activity className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link onClick={() => setIsMobileMenuOpen(false)} to="/profile" className={`w-full px-4 py-3.5 rounded-xl font-medium text-sm flex items-center gap-3 transition-all duration-200 ${location.pathname === '/profile' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/40' : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                      <UserIcon className="w-4 h-4" /> Profile
                    </Link>
                  </>
                )}

                <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full mt-4 px-4 py-3.5 rounded-xl border border-red-500/35 bg-red-500/10 hover:bg-red-500/20 transition-all duration-200 font-medium text-sm flex items-center gap-3 text-red-400">
                  <LogOut className="w-4 h-4" /> {isGuestSession ? 'Exit Guest' : 'Sign Out'}
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Animated Page Transition Container */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 relative z-10"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>

        <footer className="py-6 border-t border-zinc-800/80 text-center text-xs text-zinc-400 space-y-2 relative z-10 bg-zinc-950/40 backdrop-blur-md">
          <div className="flex justify-center gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-white hover:underline transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-white hover:underline transition-colors">Terms of Service</Link>
          </div>
          <p>© 2026 TypeMentor AI. All rights reserved. Adaptive keystroke analytics model v1.0.0.</p>
        </footer>

        {isAuthenticated && (
          <Suspense fallback={null}>
            <AIGuide currentPage={currentPage as any} setCurrentPage={(page) => navigate(`/${page}`)} />
          </Suspense>
        )}
        
        {showWelcomeBack && (
          <WelcomeBackCard
            userName={user?.name || 'Guest'}
            lastActivity={getLastActivity(user)}
            resumeTarget={getSmartResumeTarget(
              localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id)) ? JSON.parse(localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id))!) : [],
              'None',
              user
            )}
            completedCount={localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id)) ? JSON.parse(localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id))!).length : 0}
            totalLessons={50}
            onContinue={() => {
              const completed = localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id)) ? JSON.parse(localStorage.getItem(getStorageKey('academy_completed_lessons', user?.id))!) : [];
              const target = getSmartResumeTarget(completed, 'None', user);
              handleResumeJourney(target);
            }}
            onClose={() => setShowWelcomeBack(false)}
          />
        )}
        <BetaFeedback />
      </div>
    </div>
  );
}
