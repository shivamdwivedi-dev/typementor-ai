import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/AuthStore';
import { Mail, Lock, User, Key, Brain, Code, Cpu, Keyboard, Zap, Sparkles } from 'lucide-react';
import { BoxReveal, Input, Label, BottomGradient, Ripple, OrbitingCircles } from '../components/ui/animated-form';

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
            width: 320,
            shape: 'rectangular',
          });
        }
      }
    };

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
  }, [isLogin]);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center py-10 px-4 overflow-hidden bg-[#0b0f19]">
      {/* Background Ripple Effect */}
      <Ripple mainCircleSize={240} numCircles={8} className="opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl">
        
        {/* Left Side: Animated Form */}
        <div className="flex flex-col justify-center space-y-6 w-full max-w-md mx-auto">
          <BoxReveal boxColor="#3b82f6" duration={0.4}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Brain className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">TypeMentor AI</span>
            </div>
          </BoxReveal>

          <BoxReveal boxColor="#3b82f6" duration={0.4}>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </h1>
          </BoxReveal>

          <BoxReveal boxColor="#3b82f6" duration={0.4}>
            <p className="text-sm text-zinc-400">
              {isLogin
                ? 'Sign in to access your AI-powered typing telemetry and dashboard.'
                : 'Join TypeMentor AI to boost your speed and master touch typing.'}
            </p>
          </BoxReveal>

          {(error || googleClientError) && (
            <BoxReveal boxColor="#ef4444" duration={0.3} width="100%">
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold">
                {error || googleClientError}
              </div>
            </BoxReveal>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" /> Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </BoxReveal>
            )}

            <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" /> Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </BoxReveal>

            <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" /> Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </BoxReveal>

            <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%" overflow="visible">
              <button
                type="submit"
                disabled={isLoading}
                className="relative group/btn w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 hover:cursor-pointer text-sm"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    {isLogin ? 'Sign In' : 'Create Account'} &rarr;
                  </>
                )}
                <BottomGradient />
              </button>
            </BoxReveal>
          </form>

          {/* Divider */}
          <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%">
            <div className="relative flex items-center justify-center my-2">
              <div className="w-full border-t border-zinc-800"></div>
              <span className="absolute bg-zinc-900 px-3 text-[10px] uppercase font-bold text-zinc-500 tracking-widest">
                or
              </span>
            </div>
          </BoxReveal>

          {/* Google Sign-in */}
          <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%" overflow="visible">
            {isGoogleConfigured ? (
              <div
                id="google-signin-btn"
                className="w-full flex justify-center focus:ring-2 focus:ring-blue-500 rounded-xl overflow-hidden"
                role="button"
                aria-label="Continue with Google"
                tabIndex={0}
              ></div>
            ) : (
              <button
                type="button"
                onClick={() => setGoogleClientError('Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your frontend .env file.')}
                className="w-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Google Sign-In not configured
              </button>
            )}
          </BoxReveal>

          {/* Toggle Login/Register */}
          <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%">
            <div className="pt-2 text-center text-xs text-zinc-400">
              {isLogin ? "Don't have an account?" : 'Already registered?'}
              <button
                type="button"
                onClick={handleToggle}
                className="ml-2 font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                {isLogin ? 'Create one now' : 'Sign In instead'}
              </button>
            </div>
          </BoxReveal>
        </div>

        {/* Right Side: Orbiting Tech Graphic (Visible on Desktop) */}
        <div className="hidden lg:flex flex-col items-center justify-center relative min-h-[420px] bg-zinc-950/60 rounded-2xl border border-zinc-800/80 p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none" />

          {/* Central Label */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Interactive Typing AI</h3>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Real-time WPM analytics, posture tracking, error heatmaps, and adaptive AI lessons.
            </p>
          </div>

          {/* Orbiting Circles with Icons */}
          <OrbitingCircles radius={90} duration={25} delay={0} path={true}>
            <Keyboard className="w-5 h-5 text-blue-400" />
          </OrbitingCircles>
          <OrbitingCircles radius={90} duration={25} delay={12.5} path={true}>
            <Zap className="w-5 h-5 text-yellow-400" />
          </OrbitingCircles>
          <OrbitingCircles radius={140} duration={35} delay={0} reverse path={true}>
            <Cpu className="w-5 h-5 text-purple-400" />
          </OrbitingCircles>
          <OrbitingCircles radius={140} duration={35} delay={17.5} reverse path={true}>
            <Code className="w-5 h-5 text-emerald-400" />
          </OrbitingCircles>
        </div>
      </div>
    </div>
  );
}
