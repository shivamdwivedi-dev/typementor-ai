import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/AuthStore';

// Layout (NOT lazy — needed immediately for all authenticated routes)
import AppLayout from './components/AppLayout';

// ── Lazy-loaded pages (code splitting by route) ────────────────────────────
// This reduces the initial JS bundle by only loading page code when navigated to.
const LandingPage    = React.lazy(() => import('./pages/LandingPage'));
const AuthPage       = React.lazy(() => import('./pages/AuthPage'));
const PracticeBoard  = React.lazy(() => import('./pages/PracticeBoard'));
const Dashboard      = React.lazy(() => import('./pages/Dashboard'));
const LearningPath   = React.lazy(() => import('./components/LearningPath'));
const Profile        = React.lazy(() => import('./pages/Profile'));
const EnduranceArena = React.lazy(() => import('./components/EnduranceArena'));
const InterviewRoom  = React.lazy(() => import('./pages/InterviewRoom'));
const TypingAcademy  = React.lazy(() => import('./pages/TypingAcademy'));
const PrivacyPolicy  = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));

// ── Shared loading fallback ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-brand-muted font-semibold uppercase tracking-widest">Loading…</p>
      </div>
    </div>
  );
}

// ── Protected route wrapper ─────────────────────────────────────────────────
const ProtectedRoute = ({ children, requireAuth = false }: { children: React.ReactNode, requireAuth?: boolean }) => {
  const { isAuthenticated } = useAuthStore();
  const isGuestSession = localStorage.getItem('typementor_is_guest') === 'true';

  if (!isAuthenticated && !isGuestSession) {
    return <Navigate to="/" replace />;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/practice" replace />;
  }

  return <>{children}</>;
};

// ── App routes ──────────────────────────────────────────────────────────────
export default function AppRoutes() {
  const { isAuthenticated } = useAuthStore();
  const isGuestSession = localStorage.getItem('typementor_is_guest') === 'true';

  // Helper for LandingPage props based on original App.tsx
  const handleLandingGetStarted = () => {
    window.location.href = '/auth';
  };
  const handleLandingTryAcademy = () => {
    localStorage.setItem('typementor_is_guest', 'true');
    window.location.href = '/academy';
  };
  const handleLandingNavigateToPage = (page: string) => {
    localStorage.setItem('typementor_is_guest', 'true');
    window.location.href = `/${page}`;
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Pages outside the standard layout (Landing & Auth) */}
        <Route path="/" element={
          (isAuthenticated || isGuestSession) ? <Navigate to="/practice" replace /> :
          <div className="min-h-screen bg-brand-bg flex flex-col font-sans select-none text-brand-text">
            <header className="border-b border-brand-border bg-brand-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <div className="bg-brand-primary p-2.5 rounded-xl text-white shadow-lg shadow-brand-primary/20">
                  <svg className="w-6 h-6 lucide lucide-brain" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/></svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                    TypeMentor <span className="text-brand-primary font-black px-1.5 py-0.5 rounded text-xs bg-brand-primary/10">AI</span>
                  </h1>
                  <p className="text-[10px] text-brand-muted tracking-wider uppercase font-semibold">Adaptive Typing Coach</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleLandingGetStarted} className="text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/95 px-4 py-2 rounded-xl transition-all border border-indigo-400/40">
                  Sign In / Register
                </button>
              </div>
            </header>
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
              <LandingPage onGetStarted={handleLandingGetStarted} onTryAcademy={handleLandingTryAcademy} onNavigateToPage={handleLandingNavigateToPage} />
            </main>
          </div>
        } />

        <Route path="/auth" element={
          isAuthenticated ? <Navigate to="/practice" replace /> :
          <div className="min-h-screen bg-brand-bg flex flex-col font-sans select-none text-brand-text">
            <header className="border-b border-brand-border bg-brand-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
                <div className="bg-brand-primary p-2.5 rounded-xl text-white shadow-lg shadow-brand-primary/20">
                  <svg className="w-6 h-6 lucide lucide-brain" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/></svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                    TypeMentor <span className="text-brand-primary font-black px-1.5 py-0.5 rounded text-xs bg-brand-primary/10">AI</span>
                  </h1>
                  <p className="text-[10px] text-brand-muted tracking-wider uppercase font-semibold">Adaptive Typing Coach</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => window.location.href = '/'} className="text-xs text-brand-muted hover:text-white font-semibold border border-brand-border px-3 py-1.5 rounded-lg bg-brand-card/25">
                  ← Back
                </button>
              </div>
            </header>
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
              <AuthPage onSuccess={() => { window.location.href = '/practice'; }} />
              {import.meta.env.VITE_ENABLE_GUEST_MODE === 'true' && (
                <div className="mt-4 text-center">
                  <button onClick={() => { localStorage.setItem('typementor_is_guest', 'true'); window.location.href = '/practice'; }} className="text-xs text-brand-muted hover:text-brand-text underline underline-offset-2 transition-colors">
                    Continue as Guest (progress not saved)
                  </button>
                </div>
              )}
            </main>
          </div>
        } />

        {/* Pages inside the standard Layout */}
        <Route element={<AppLayout />}>
          {/* Guest OR Authenticated */}
          <Route path="/practice" element={<ProtectedRoute><PracticeBoard /></ProtectedRoute>} />
          <Route path="/academy" element={<ProtectedRoute><TypingAcademy /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPolicy onBack={() => window.history.back()} />} />
          <Route path="/terms" element={<TermsOfService onBack={() => window.history.back()} />} />

          {/* Authenticated ONLY */}
          <Route path="/dashboard" element={<ProtectedRoute requireAuth><Dashboard onStartRecoveryPractice={() => {}} onContinueJourney={() => {}} /></ProtectedRoute>} />
          <Route path="/path" element={<ProtectedRoute requireAuth><LearningPath currentLevel={useAuthStore.getState().user?.level ?? 1} onSelectNode={() => window.location.href = '/practice'} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute requireAuth><Profile /></ProtectedRoute>} />
          <Route path="/endurance" element={<ProtectedRoute requireAuth><EnduranceArena /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute requireAuth>
            <div className="max-w-4xl mx-auto space-y-6">
              <button onClick={() => window.location.href = '/practice'} className="text-xs text-brand-primary font-bold hover:underline mb-2">
                ← Back to Practice Board
              </button>
              <InterviewRoom />
            </div>
          </ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
