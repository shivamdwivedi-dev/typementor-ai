import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/AuthStore';
import {
  Mail,
  Lock,
  Key,
  Brain,
  Code,
  Cpu,
  Keyboard,
  Zap,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { BoxReveal, Input, Label, BottomGradient, Ripple, OrbitingCircles } from '../components/ui/animated-form';
import { MagicLinkOtpLogin, MagicLinkStep } from '../components/auth/MagicLinkOtpLogin';

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
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpStep, setOtpStep] = useState<MagicLinkStep>('email');
  
  // Password reset specific state
  const [resetStep, setResetStep] = useState<'otp' | 'new-password'>('otp');
  const [resetOtpStep, setResetOtpStep] = useState<MagicLinkStep>('email');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [loginSuccessNotice, setLoginSuccessNotice] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const [googleClientError, setGoogleClientError] = useState<string | null>(null);
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(true);

  const {
    login,
    register,
    verifyOtp,
    resendOtp,
    requestPasswordReset,
    verifyPasswordResetOtp,
    resendPasswordResetOtp,
    resetPassword,
    loginWithGoogle,
    error,
    isLoading,
    clearError,
  } = useAuthStore();

  const handleToggle = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setEmail('');
    setPassword('');
    setName('');
    setOtpStep('email');
    setResetOtpStep('email');
    setResetStep('otp');
    setResetError(null);
    setLoginSuccessNotice(null);
    clearError();
    setGoogleClientError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const success = await login(email, password);
    if (success) {
      onSuccess();
    }
  };

  const handleSendRegistrationOtp = async (targetEmail: string) => {
    if (!name.trim() || name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const res = await register(targetEmail, password, name);
    if (!res.success) {
      throw new Error(res.error || 'Failed to dispatch verification code.');
    }
    return true;
  };

  const handleVerifyOtpCode = async (code: string) => {
    const success = await verifyOtp(email, code);
    if (success) {
      setTimeout(() => {
        onSuccess();
      }, 1200);
      return true;
    }
    return false;
  };

  const handleResendOtp = async (targetEmail: string) => {
    const res = await resendOtp(targetEmail);
    if (!res.success) {
      throw new Error(res.error || 'Failed to resend code.');
    }
    return true;
  };

  // Password reset handlers
  const handleSendResetOtp = async (targetEmail: string) => {
    setResetError(null);
    const res = await requestPasswordReset(targetEmail);
    if (!res.success) {
      throw new Error(res.error || 'Failed to dispatch reset code.');
    }
    return true;
  };

  const handleVerifyResetOtpCode = async (code: string) => {
    setResetError(null);
    const res = await verifyPasswordResetOtp(email, code);
    if (res.success && res.resetToken) {
      setResetToken(res.resetToken);
      setResetStep('new-password');
      return true;
    }
    throw new Error(res.error || 'Invalid or expired confirmation code.');
  };

  const handleResendResetOtp = async (targetEmail: string) => {
    const res = await resendPasswordResetOtp(targetEmail);
    if (!res.success) {
      throw new Error(res.error || 'Failed to resend code.');
    }
    return true;
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 8) {
      setResetError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!resetToken) {
      setResetError('Password reset session expired. Please restart the reset process.');
      setResetStep('otp');
      setResetOtpStep('email');
      return;
    }

    setIsResetting(true);
    const res = await resetPassword(email, resetToken, newPassword);
    setIsResetting(false);

    if (!res.success) {
      setResetError(res.error || 'Failed to update password.');
      return;
    }

    setLoginSuccessNotice('Password reset successfully! Please sign in with your new password.');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken(null);
    setPassword('');
    setAuthMode('login');
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
    const DEFAULT_CLIENT_ID = '1034864032860-5h45uu3mjde019p1v43crq2inksns867.apps.googleusercontent.com';
    const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientId = (envClientId && envClientId !== 'your_google_client_id_here' && envClientId.trim() !== '')
      ? envClientId.trim()
      : DEFAULT_CLIENT_ID;

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
  }, [authMode, otpStep, resetOtpStep]);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center py-10 px-4 overflow-hidden bg-[#0b0f19]">
      {/* Background Ripple Effect */}
      <Ripple mainCircleSize={240} numCircles={8} className="opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-10 shadow-2xl">
        
        {/* Left Side: Authentication Form */}
        <div className="flex flex-col justify-center space-y-6 w-full max-w-md mx-auto">
          {authMode === 'register' ? (
            /* ── Register / OTP Flow (MagicLinkOtpLogin) ─────────────────────── */
            <MagicLinkOtpLogin
              appName="TypeMentor AI"
              logo={<Brain className="size-4 text-white" />}
              email={email}
              onEmailChange={setEmail}
              step={otpStep}
              onStepChange={setOtpStep}
              onSendLink={handleSendRegistrationOtp}
              onVerifyCode={handleVerifyOtpCode}
              onResend={handleResendOtp}
              resendSeconds={60}
              codeLength={6}
              onUsePassword={() => setAuthMode('login')}
              submitButtonText="Send Verification Code"
              emailSubtitle="Create your verified account. We'll send a 6-digit confirmation code directly to your email."
              extraFields={
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 text-sm text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                      Password (min. 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 text-sm text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
              }
            />
          ) : authMode === 'forgot-password' ? (
            /* ── Password Reset Lifecycle ────────────────────────────────────── */
            resetStep === 'otp' ? (
              <MagicLinkOtpLogin
                appName="TypeMentor Security"
                logo={<Lock className="size-4 text-white" />}
                email={email}
                onEmailChange={setEmail}
                step={resetOtpStep}
                onStepChange={setResetOtpStep}
                onSendLink={handleSendResetOtp}
                onVerifyCode={handleVerifyResetOtpCode}
                onResend={handleResendResetOtp}
                resendSeconds={60}
                codeLength={6}
                onUsePassword={() => setAuthMode('login')}
                submitButtonText="Send Password Reset Code"
                emailSubtitle="Enter your registered account email. We will send a secure 6-digit confirmation code to reset your password."
              />
            ) : (
              /* ── Step 2: Choose New Password ───────────────────────────────── */
              <div className="w-full max-w-[440px] rounded-[28px] border border-zinc-800 bg-[#141b2b] text-slate-50 shadow-2xl shadow-blue-500/10 backdrop-blur-xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5 border-b border-zinc-800 pb-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                    <Lock className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Create New Password</h2>
                    <p className="text-xs text-zinc-400">Securing {email}</p>
                  </div>
                </div>

                {resetError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                    {resetError}
                  </div>
                )}

                <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                      New Password (min. 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 text-sm text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-3.5 text-sm text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                  >
                    {isResetting ? (
                      <>
                        <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Updating Password…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Update Password & Sign In
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-5 border-t border-zinc-800 pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setResetError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="size-3.5" /> Back to Sign In
                  </button>
                </div>
              </div>
            )
          ) : (
            /* ── Sign In (Existing User) ─────────────────────────────────────── */
            <>
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
                  Welcome Back!
                </h1>
              </BoxReveal>

              <BoxReveal boxColor="#3b82f6" duration={0.4}>
                <p className="text-sm text-zinc-400">
                  Sign in to access your AI-powered typing telemetry, streak, and arena ranking.
                </p>
              </BoxReveal>

              {loginSuccessNotice && (
                <BoxReveal boxColor="#10b981" duration={0.3} width="100%">
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{loginSuccessNotice}</span>
                  </div>
                </BoxReveal>
              )}

              {(error || googleClientError) && (
                <BoxReveal boxColor="#ef4444" duration={0.3} width="100%">
                  <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-semibold">
                    {error || googleClientError}
                  </div>
                </BoxReveal>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-zinc-300 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-400" /> Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot-password');
                          setResetStep('otp');
                          setResetOtpStep('email');
                          setResetError(null);
                        }}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
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
                        Sign In &rarr;
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
                    onClick={() => setGoogleClientError('Google Client ID is not configured.')}
                    className="w-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-medium py-2.5 px-4 rounded-xl transition-colors text-sm"
                  >
                    Google Sign-In
                  </button>
                )}
              </BoxReveal>

              {/* Toggle to OTP Registration */}
              <BoxReveal boxColor="#3b82f6" duration={0.4} width="100%">
                <div className="pt-2 text-center text-xs text-zinc-400">
                  Don't have an account?
                  <button
                    type="button"
                    onClick={handleToggle}
                    className="ml-2 font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                  >
                    Sign up with Email OTP &rarr;
                  </button>
                </div>
              </BoxReveal>
            </>
          )}
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
              Real-time WPM analytics, 3D finger guidance, error heatmaps, and adaptive AI lessons.
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

