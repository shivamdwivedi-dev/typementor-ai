import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { Mail, Lock, User, Key, Eye, EyeOff, Brain } from 'lucide-react';

interface AuthPageProps {
  onSuccess: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleClientError, setGoogleClientError] = useState<string | null>(null);
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(true);

  const { login, register, loginWithGoogle, error, isLoading, clearError } = useAuthStore();

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setName('');
    clearError();
    setGoogleClientError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) return;

    let success = false;
    if (isLogin) {
      success = await login(email, password);
    } else {
      success = await register(email, password, name);
    }

    if (success) {
      onSuccess();
    }
  };

  const handleGoogleCallback = async (response: any) => {
    if (!response.credential) {
      setGoogleClientError('Google login failed. Please try again.');
      return;
    }
    setGoogleClientError(null);
    const success = await loginWithGoogle(response.credential);
    if (success) {
      onSuccess();
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id_here' || clientId.trim() === '') {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured in frontend environment.');
      setIsGoogleConfigured(false);
      return;
    }
    setIsGoogleConfigured(true);

    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCallback,
          auto_select: false,
        });

        const parentButton = document.getElementById('google-signin-btn');
        if (parentButton) {
          window.google.accounts.id.renderButton(parentButton, {
            theme: 'filled_blue',
            size: 'large',
            text: 'continue_with',
            width: 384,
            shape: 'rectangular',
          });
        }
      }
    };

    // If script already loaded, initialize directly
    if (document.getElementById('google-client-script')) {
      loadGoogleScript();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = loadGoogleScript;
    document.body.appendChild(script);

    return () => {
      // Keep script loaded globally, but clean up state if necessary
    };
  }, [isLogin]);

  return (
    <div className="w-full max-w-md mx-auto my-12">
      <div className="glass-panel p-8 rounded-2xl border border-brand-border/40 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-brand-success/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-brand-primary/10 p-3 rounded-2xl mb-4 text-brand-primary border border-brand-primary/20">
            <Brain className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isLogin ? 'Welcome Back!' : 'Start Your AI Coach'}
          </h2>
          <p className="text-sm text-brand-muted text-center mt-1">
            {isLogin
              ? 'Sign in to access your typing intelligence telemetry.'
              : 'Create your account to start profiling your typing patterns.'}
          </p>
        </div>

        {(error || googleClientError) && (
          <div className="mb-6 p-3 rounded-lg border border-brand-danger/30 bg-brand-danger/10 text-brand-danger text-xs font-semibold">
            {error || googleClientError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase text-brand-muted tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-3 pl-10 pr-4 text-sm transition-all text-white placeholder-brand-muted"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-brand-muted tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-3 pl-10 pr-4 text-sm transition-all text-white placeholder-brand-muted"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-brand-muted tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-3 pl-10 pr-10 text-sm transition-all text-white placeholder-brand-muted"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-muted hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <Key className="w-4 h-4" />
                {isLogin ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        {/* Continue with Google button container */}
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="relative w-full flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-border/40"></div>
            </div>
            <span className="relative bg-brand-bg/95 px-3 text-[10px] uppercase font-bold text-brand-muted tracking-widest">
              or
            </span>
          </div>

          {isGoogleConfigured ? (
            <div
              id="google-signin-btn"
              className="w-full flex justify-center focus:ring-2 focus:ring-brand-primary rounded-xl overflow-hidden"
              role="button"
              aria-label="Continue with Google"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const childBtn = document.querySelector('#google-signin-btn iframe') as HTMLElement;
                  if (childBtn) childBtn.click();
                }
              }}
            ></div>
          ) : (
            <button
              type="button"
              onClick={() => setGoogleClientError('Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your frontend .env file.')}
              className="w-full max-w-[384px] flex items-center justify-center bg-white/80 hover:bg-white text-gray-600 border border-brand-border/40 font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm"
            >
              <svg className="w-5 h-5 mr-3 opacity-60" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google Sign-In not configured
            </button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-brand-border/40 text-center">
          <p className="text-xs text-brand-muted">
            {isLogin ? "Don't have an account?" : 'Already registered?'}
            <button
              onClick={handleToggle}
              className="ml-1.5 font-semibold text-brand-primary hover:underline hover:text-white"
            >
              {isLogin ? 'Create one now' : 'Sign In instead'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
