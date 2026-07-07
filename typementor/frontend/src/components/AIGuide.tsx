import { useState, useEffect, useMemo } from 'react';
import { Volume2, VolumeX, RotateCcw, Square, X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useTypingStore } from '../store/TypingStore';
import { getApiUrl } from '../utils/api';

interface AIGuideProps {
  currentPage: string;
  setCurrentPage: (page: any) => void;
}

interface TourStep {
  title: string;
  text: string;
  speakText: string;
  targetPage?: string;
}

export default function AIGuide({ currentPage, setCurrentPage }: AIGuideProps) {
  const { isActive: isTypingActive, accuracy } = useTypingStore();

  const [step, setStep] = useState<number>(-1); // -1 means welcome / minimized
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('typementor_ai_guide_voice_enabled') === 'true';
  });

  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Load voices dynamically (needed for Chrome/async voice loading)
  useEffect(() => {
    const selectBestVoice = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang.startsWith('en'));

      // Preferred names for younger/young male English sounding voices
      const preferences = ['david', 'google us english', 'natural male', 'mark', 'james', 'george', 'guy'];
      for (const pref of preferences) {
        const found = enVoices.find(v => v.name.toLowerCase().includes(pref));
        if (found) {
          setSelectedVoice(found);
          return;
        }
      }
      if (enVoices.length > 0) {
        setSelectedVoice(enVoices[0]);
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = selectBestVoice;
      selectBestVoice();
    }
  }, []);

  // Determine user history for smart suggestions
  const [hasMistakes, setHasMistakes] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(0);

  useEffect(() => {
    const token = localStorage.getItem('typementor_token');
    if (token) {
      // Look up session history to see if they are returning or have mistakes
      Promise.all([
        fetch(getApiUrl('/api/sessions?limit=10'), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(getApiUrl('/api/analytics/recovery-report'), { headers: { Authorization: `Bearer ${token}` } })
      ]).then(async ([res1, res2]) => {
        if (res1.ok) {
          const sessions = await res1.json();
          setSessionCount(sessions.length);
        }
        if (res2.ok) {
          const report = await res2.json();
          setHasMistakes(report.mostMistypedKey !== 'None');
        }
      }).catch(err => console.error('Error fetching onboarding context', err));
    }
  }, [isOpen]);

  const smartRecommendation = useMemo(() => {
    if (sessionCount === 0) {
      return {
        text: 'Since this is your first time here, I highly recommend starting with the structured lessons in the Typing Academy to learn correct finger placement!',
        speak: 'Since this is your first time here, I highly recommend starting with the structured lessons in the Typing Academy to learn correct finger placement!',
        action: 'academy',
        btnText: 'Start Typing Academy'
      };
    }
    if (hasMistakes) {
      return {
        text: 'I noticed some keys are giving you trouble. Let\'s practice a customized Recovery Drill to build muscle memory!',
        speak: 'I noticed some keys are giving you trouble. Let\'s practice a customized Recovery Drill to build muscle memory!',
        action: 'practice', // Recovery practice starts from dashboard/academy CTA
        btnText: 'Go to Dashboard'
      };
    }
    if (accuracy > 95) {
      return {
        text: 'Your precision is incredible! You should challenge your stamina in the long-form Endurance Arena.',
        speak: 'Your precision is incredible! You should challenge your stamina in the long-form Endurance Arena.',
        action: 'endurance',
        btnText: 'Enter Endurance Arena'
      };
    }
    return {
      text: 'Welcome back! Let\'s continue structured academy courses to master typing milestones.',
      speak: 'Welcome back! Let\'s continue structured academy courses to master typing milestones.',
      action: 'academy',
      btnText: 'Continue Academy'
    };
  }, [sessionCount, hasMistakes, accuracy]);

  const steps: TourStep[] = useMemo(() => [
    {
      title: 'Welcome to TypeMentor AI',
      text: 'Welcome to TypeMentor AI. I’m your smart assistant, and I’ll help you understand where to start.',
      speakText: 'Welcome to TypeMentor AI. I’m your smart assistant, and I’ll help you understand where to start.'
    },
    {
      title: 'Typing Academy',
      text: 'Start here if you are new. This teaches finger placement, home row, accuracy, and structured lessons.',
      speakText: 'Start here if you are new. This teaches finger placement, home row, accuracy, and structured lessons.',
      targetPage: 'academy'
    },
    {
      title: 'Practice Board',
      text: 'Use this for quick typing sessions and daily speed improvement.',
      speakText: 'Use this for quick typing sessions and daily speed improvement.',
      targetPage: 'practice'
    },
    {
      title: 'Endurance Arena',
      text: 'Best for serious typists, writers, steno learners, exam aspirants, and anyone who wants long-form typing practice.',
      speakText: 'Best for serious typists, writers, steno learners, exam aspirants, and anyone who wants long-form typing practice.',
      targetPage: 'endurance'
    },
    {
      title: 'Learning Path',
      text: 'Follow this to improve step by step based on your progress.',
      speakText: 'Follow this to improve step by step based on your progress.',
      targetPage: 'path'
    },
    {
      title: 'Dashboard Analytics',
      text: 'Track your WPM, accuracy, weak keys, recovery progress, XP, streaks, and achievements.',
      speakText: 'Track your WPM, accuracy, weak keys, recovery progress, XP, streaks, and achievements.',
      targetPage: 'dashboard'
    },
    {
      title: 'Profile & Credentials',
      text: 'View your certificates, badges, progress, and personal typing history.',
      speakText: 'View your certificates, badges, progress, and personal typing history.',
      targetPage: 'profile'
    },
    {
      title: 'My Smart Recommendation',
      text: smartRecommendation.text,
      speakText: smartRecommendation.speak,
      targetPage: smartRecommendation.action
    }
  ], [smartRecommendation]);

  // Handle Speech synthesis
  const speakCurrentStep = (stepIndex: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Stop previous voice output
    window.speechSynthesis.cancel();

    if (!isVoiceEnabled || isTypingActive || stepIndex < 0 || stepIndex >= steps.length) return;

    const tourStep = steps[stepIndex];
    const utterance = new SpeechSynthesisUtterance(tourStep.speakText);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    // High quality pitch and rate settings for young male voice feel
    utterance.pitch = 1.15;
    utterance.rate = 1.05;

    window.speechSynthesis.speak(utterance);
  };

  const stopVoice = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleVoice = () => {
    const nextVal = !isVoiceEnabled;
    setIsVoiceEnabled(nextVal);
    localStorage.setItem('typementor_ai_guide_voice_enabled', String(nextVal));

    if (nextVal) {
      setTimeout(() => speakCurrentStep(step), 100);
    } else {
      stopVoice();
    }
  };

  // Launch onboarding automatically for first-time users
  useEffect(() => {
    const completed = localStorage.getItem('typementor_onboarding_completed');
    if (!completed) {
      setStep(0);
      setIsOpen(true);
    }
  }, []);

  // Sync tab page when stepping through the tour
  useEffect(() => {
    if (step >= 0 && step < steps.length) {
      const target = steps[step].targetPage;
      if (target && target !== currentPage) {
        setCurrentPage(target);
      }
      speakCurrentStep(step);
    }
  }, [step]);

  // Cancel sound if user starts typing or exits page
  useEffect(() => {
    if (isTypingActive) {
      stopVoice();
      setIsOpen(false); // minimize guide during active typing sessions
    }
  }, [isTypingActive]);

  useEffect(() => {
    return () => {
      stopVoice();
    };
  }, []);

  // Watch for page navigation outside of onboarding, sync step or minimize voice
  useEffect(() => {
    if (step >= 0 && step < steps.length) {
      const activeTarget = steps[step].targetPage;
      if (activeTarget && currentPage !== activeTarget) {
        stopVoice();
      }
    }
  }, [currentPage]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('typementor_onboarding_completed', 'true');
    stopVoice();
    setStep(-1);
    setIsOpen(false);
  };

  // Listen for the custom "restart onboarding tour" trigger
  useEffect(() => {
    const handleRestartEvent = () => {
      setStep(0);
      setIsOpen(true);
    };
    window.addEventListener('restart_typementor_tour', handleRestartEvent);
    return () => {
      window.removeEventListener('restart_typementor_tour', handleRestartEvent);
    };
  }, []);

  if (isTypingActive) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 max-w-[calc(100vw-3rem)] pointer-events-none md:max-w-sm">
      {/* ── Onboarding Tour / Speech Bubble ── */}
      {isOpen && step >= 0 && (
        <div className="pointer-events-auto glass-panel p-5 rounded-2xl border border-brand-primary/40 shadow-xl shadow-brand-primary/10 w-full animate-in slide-in-from-bottom duration-300 relative overflow-hidden bg-slate-950/85 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-border/30 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              <h3 className="font-extrabold text-white text-xs tracking-wide uppercase">
                {steps[step].title}
              </h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-brand-muted hover:text-white transition-colors"
              title="Skip Tour"
              aria-label="Skip onboarding tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtitle / Tour explanation body */}
          <p className="text-xs text-brand-text/90 leading-relaxed mb-4 min-h-[48px]">
            {steps[step].text}
          </p>

          {/* Voice Speech Control Panel */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-brand-border/30 p-2.5 rounded-xl mb-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleVoice}
                className={`p-1.5 rounded-lg border transition-all ${
                  isVoiceEnabled
                    ? 'bg-brand-primary/20 border-brand-primary text-brand-primary'
                    : 'bg-brand-card/35 border-brand-border text-brand-muted hover:text-white'
                }`}
                title={isVoiceEnabled ? 'Mute Guide' : 'Unmute Guide'}
                aria-label={isVoiceEnabled ? 'Mute AI voice assistant' : 'Unmute AI voice assistant'}
              >
                {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[10px] text-brand-muted font-bold">
                Voice Assistant: {isVoiceEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            {isVoiceEnabled && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => speakCurrentStep(step)}
                  className="p-1 rounded bg-brand-card hover:bg-brand-border/40 text-brand-muted hover:text-white transition-colors"
                  title="Replay Audio"
                  aria-label="Replay current step explanation audio"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  onClick={stopVoice}
                  className="p-1 rounded bg-brand-card hover:bg-brand-border/40 text-brand-muted hover:text-white transition-colors"
                  title="Stop Audio"
                  aria-label="Stop AI assistant audio playback"
                >
                  <Square className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-brand-border/20">
            <button
              onClick={handleSkip}
              className="text-brand-muted hover:text-white font-semibold flex items-center gap-1 hover:underline"
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={handleBack}
                  className="px-3 py-1.5 rounded-lg border border-brand-border hover:bg-brand-card text-brand-muted hover:text-white transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              {step === steps.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentPage(smartRecommendation.action);
                    handleComplete();
                  }}
                  className="px-4 py-1.5 rounded-lg bg-brand-warning text-slate-950 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950/20" />
                  {smartRecommendation.btnText}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary/95 text-white font-bold transition-all flex items-center gap-1"
                >
                  Next
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Premium Animated SVG Floating Avatar ── */}
      <button
        onClick={() => {
          if (isOpen) {
            handleComplete();
          } else {
            setStep(0);
            setIsOpen(true);
          }
        }}
        className="pointer-events-auto group w-12 h-12 md:w-14 md:h-14 rounded-full bg-brand-bg border border-brand-primary/40 shadow-lg shadow-brand-primary/20 flex items-center justify-center relative overflow-hidden transition-all hover:scale-105 active:scale-95 duration-200"
        aria-label={isOpen ? "Close AI coach guide onboarding assistant" : "Open AI coach guide onboarding assistant"}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-transparent pointer-events-none" />
        <div className="absolute -inset-1 bg-brand-primary/20 rounded-full blur-sm group-hover:bg-brand-primary/35 transition-all animate-pulse" />

        {/* Animated robot guide icon SVG */}
        <svg
          viewBox="0 0 64 64"
          className="w-8 h-8 md:w-9 md:h-9 relative z-10 transition-transform group-hover:translate-y-[-1px] animate-bounce-slow"
          style={{ animationDuration: '4s' }}
        >
          {/* Robot Head */}
          <rect x="16" y="20" width="32" height="24" rx="8" fill="#1e293b" stroke="#6366f1" strokeWidth="2.5" />
          {/* Eyes (glow) */}
          <circle cx="26" cy="30" r="3.5" fill="#f59e0b" className="animate-pulse" />
          <circle cx="38" cy="30" r="3.5" fill="#f59e0b" className="animate-pulse" />
          {/* Smile/LED mouth */}
          <path d="M 26 37 Q 32 41 38 37" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Antenna */}
          <line x1="32" y1="20" x2="32" y2="10" stroke="#6366f1" strokeWidth="2.5" />
          <circle cx="32" cy="9" r="3" fill="#6366f1" />
          {/* Side ears */}
          <rect x="12" y="27" width="4" height="10" rx="2" fill="#6366f1" />
          <rect x="48" y="27" width="4" height="10" rx="2" fill="#6366f1" />
        </svg>

        {/* Floating badge count if tour is not completed */}
        {!localStorage.getItem('typementor_onboarding_completed') && !isOpen && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-brand-warning rounded-full border-2 border-brand-bg flex items-center justify-center text-[8px] font-black text-slate-950 animate-ping">
            !
          </span>
        )}
      </button>
    </div>
  );
}
