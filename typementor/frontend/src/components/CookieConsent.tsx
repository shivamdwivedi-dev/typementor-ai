import { useState, useEffect } from 'react';
import { Cookie, Shield, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'typementor_cookie_consent';

export type CookieConsentChoice = 'accepted' | 'essential';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const savedChoice = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!savedChoice) {
        // Small delay so it doesn't flicker on initial render
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleChoice = (choice: CookieConsentChoice) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, choice);
      window.dispatchEvent(new CustomEvent('typementor_cookie_consent_change', { detail: { choice } }));
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and Privacy Preferences"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/95 border border-zinc-800/90 shadow-2xl backdrop-blur-xl text-white space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Cookie className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Cookie & Privacy Preferences</h3>
              <p className="text-[11px] text-zinc-400">Your privacy choices on TypeMentor AI</p>
            </div>
          </div>
          <button
            onClick={() => handleChoice('essential')}
            className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
            title="Dismiss and use essential only"
            aria-label="Dismiss cookie notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          We use essential cookies to maintain your login session and preserve your typing practice state.
          With your permission, our partners (such as Google) may use cookies to measure site performance and serve relevant advertisements in accordance with our{' '}
          <Link to="/privacy" className="text-blue-400 underline hover:text-white font-medium">
            Privacy Policy
          </Link>.
        </p>

        <div className="flex items-center justify-between gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleChoice('essential')}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all text-center"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleChoice('accepted')}
            className="flex-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept All</span>
          </button>
        </div>

        <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-0.5 border-t border-zinc-900">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" /> GDPR & CCPA Compliant
          </span>
          <div className="flex gap-2">
            <Link to="/privacy" className="hover:text-zinc-300 hover:underline">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-zinc-300 hover:underline">Terms</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
