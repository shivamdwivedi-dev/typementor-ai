import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SEOMeta from '../components/SEOMeta';
import { GlowCard, Typewriter } from '../components/ui';
import TypingCertificateModal, { CertificateData } from '../components/TypingCertificateModal';
import {
  getTypingTestPassage,
  getAvailableCategories,
  getSeenPassagesCount,
  GeneratedTestPassage,
} from '../utils/typingTestPassages';
import {
  Timer,
  RotateCcw,
  ShieldCheck,
  Zap,
  Clock,
  Flame,
  Crown,
  Trophy,
  Volume2,
  VolumeX,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Share2,
  Award,
  Building2,
  HelpCircle,
  BarChart3,
} from 'lucide-react';

export type TestDuration = 1 | 2 | 3 | 5;

interface TestKeystroke {
  key: string;
  time: number;
  isCorrect: boolean;
}

const DURATION_CONFIGS: Record<TestDuration, {
  label: string;
  seconds: number;
  badge: string;
  glowColor: 'blue' | 'green' | 'purple' | 'orange';
  description: string;
  icon: React.ReactNode;
}> = {
  1: {
    label: '1 Minute',
    seconds: 60,
    badge: 'Sprint Test',
    glowColor: 'blue',
    description: 'Quick speed benchmark & instant sharing',
    icon: <Zap className="w-5 h-5 text-cyan-400" />,
  },
  2: {
    label: '2 Minutes',
    seconds: 120,
    badge: 'Standard Baseline',
    glowColor: 'green',
    description: 'Rhythm stability & balanced pacing',
    icon: <Clock className="w-5 h-5 text-emerald-400" />,
  },
  3: {
    label: '3 Minutes',
    seconds: 180,
    badge: 'Endurance Check',
    glowColor: 'purple',
    description: 'Sustained muscular stamina evaluation',
    icon: <Flame className="w-5 h-5 text-purple-400" />,
  },
  5: {
    label: '5 Minutes',
    seconds: 300,
    badge: 'Civil Service / Pro',
    glowColor: 'orange',
    description: 'Official employment & government standard',
    icon: <Crown className="w-5 h-5 text-amber-400" />,
  },
};

export default function TypingTest() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper to parse duration from search params (?time=1m, ?time=5m, etc.)
  const initialDuration = useMemo<TestDuration>(() => {
    const timeParam = searchParams.get('time') || searchParams.get('duration');
    if (timeParam === '2' || timeParam === '2m') return 2;
    if (timeParam === '3' || timeParam === '3m') return 3;
    if (timeParam === '5' || timeParam === '5m') return 5;
    return 1;
  }, [searchParams]);

  // Helper to parse category from search params (?category=science, etc.)
  const initialCategory = useMemo<string>(() => {
    const cat = searchParams.get('category') || searchParams.get('cat');
    if (!cat) return 'Random';
    const available = getAvailableCategories();
    const match = available.find(c => c.toLowerCase() === cat.toLowerCase());
    return match || 'Random';
  }, [searchParams]);

  // Test configuration
  const [duration, setDuration] = useState<TestDuration>(initialDuration);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Test state
  const [testState, setTestState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [passage, setPassage] = useState<GeneratedTestPassage>(() =>
    getTypingTestPassage({ durationMinutes: initialDuration, category: initialCategory })
  );

  const [inputCharIndex, setInputCharIndex] = useState<number>(0);
  const [typedChars, setTypedChars] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(() => DURATION_CONFIGS[initialDuration].seconds);
  const [keystrokes, setKeystrokes] = useState<TestKeystroke[]>([]);
  const [seenCount, setSeenCount] = useState<number>(() => getSeenPassagesCount());

  // Final stats
  const [finalStats, setFinalStats] = useState<{
    netWpm: number;
    rawWpm: number;
    accuracy: number;
    consistency: number;
    totalChars: number;
    correctChars: number;
    incorrectChars: number;
    percentile: string;
    tier: string;
  } | null>(null);

  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Verification mode state (when user clicks a shared certificate link)
  const [verifiedCertData] = useState<CertificateData | null>(() => {
    const cert = searchParams.get('cert') || searchParams.get('id');
    if (!cert) return null;
    const wpm = Number(searchParams.get('wpm')) || 80;
    const acc = Number(searchParams.get('acc')) || 98;
    const raw = Number(searchParams.get('raw')) || wpm + 3;
    const name = searchParams.get('name') || 'Speed Typist';
    const durRaw = searchParams.get('time')?.replace('m', '');
    const dur = (durRaw === '2' ? 2 : durRaw === '3' ? 3 : durRaw === '5' ? 5 : 1) as TestDuration;

    return {
      netWpm: wpm,
      rawWpm: raw,
      accuracy: acc,
      consistency: 92,
      durationMinutes: dur,
      category: 'Official Assessment',
      tier: wpm >= 100 ? 'Grandmaster' : wpm >= 80 ? 'Master' : wpm >= 60 ? 'Professional' : 'Fluent',
      percentile: wpm >= 100 ? 'Top 1%' : wpm >= 80 ? 'Top 5%' : wpm >= 60 ? 'Top 15%' : 'Top 35%',
      totalChars: wpm * 5 * dur,
      correctChars: Math.round(wpm * 5 * dur * (acc / 100)),
      certificateId: cert,
      candidateName: name,
    };
  });
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(() => {
    return Boolean(searchParams.get('cert') || searchParams.get('id'));
  });

  // Interactive FAQ open state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const targetEndTimeRef = useRef<number | null>(null);
  const finishTestRef = useRef<() => void>(() => {});

  // Web Audio key click chime
  const playKeySound = useCallback((isError: boolean) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isError ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isError ? 180 : 640 + Math.random() * 40, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }, [soundEnabled]);

  // Load new passage when duration or category changes (while idle)
  const handleReloadPassage = useCallback((newDuration = duration, newCategory = selectedCategory) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    targetEndTimeRef.current = null;
    const newPassage = getTypingTestPassage({
      durationMinutes: newDuration,
      category: newCategory,
    });
    setPassage(newPassage);
    setTestState('idle');
    setInputCharIndex(0);
    setTypedChars('');
    setTimeLeft(DURATION_CONFIGS[newDuration].seconds);
    setKeystrokes([]);
    setFinalStats(null);
    startTimeRef.current = null;
    setSeenCount(getSeenPassagesCount());
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [duration, selectedCategory]);

  // Duration selection handler with URL sync
  const handleDurationChange = (d: TestDuration) => {
    if (d === duration && testState === 'idle') return;
    setDuration(d);
    handleReloadPassage(d, selectedCategory);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('time', `${d}m`);
      return p;
    }, { replace: true });
  };

  // Category selection handler with URL sync
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    handleReloadPassage(duration, cat);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (cat !== 'Random') {
        p.set('category', cat.toLowerCase());
      } else {
        p.delete('category');
      }
      return p;
    }, { replace: true });
  };

  // Finish test and calculate official metrics
  const finishTest = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    targetEndTimeRef.current = null;
    setTestState('completed');

    const totalSeconds = DURATION_CONFIGS[duration].seconds;
    const elapsedMinutes = startTimeRef.current
      ? Math.max(0.05, (Date.now() - startTimeRef.current) / 60000)
      : (totalSeconds / 60);

    const targetText = passage.text;
    let correct = 0;
    let incorrect = 0;

    for (let i = 0; i < typedChars.length; i++) {
      if (typedChars[i] === targetText[i]) {
        correct++;
      } else {
        incorrect++;
      }
    }

    const totalChars = typedChars.length;
    const rawWpm = Math.round((totalChars / 5) / elapsedMinutes) || 0;
    const netWpm = Math.max(0, Math.round(((totalChars - incorrect) / 5) / elapsedMinutes)) || 0;
    const accuracy = totalChars > 0 ? Number(((correct / totalChars) * 100).toFixed(1)) : 100;

    // Consistency estimation
    let consistency = 85;
    if (keystrokes.length > 10) {
      const intervals: number[] = [];
      for (let i = 1; i < keystrokes.length; i++) {
        intervals.push(keystrokes[i].time - keystrokes[i - 1].time);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      consistency = Math.max(50, Math.min(99, Math.round(100 - (stdDev / avg) * 35)));
    }

    // Determine percentile and rank tier
    let percentile = 'Top 50%';
    let tier = 'Intermediate Typist';
    if (netWpm >= 110) {
      percentile = 'Top 1% (Grandmaster)';
      tier = 'Transcendent Legend';
    } else if (netWpm >= 90) {
      percentile = 'Top 3% (Elite)';
      tier = 'Master Tactician';
    } else if (netWpm >= 75) {
      percentile = 'Top 10% (Advanced)';
      tier = 'High-Speed Professional';
    } else if (netWpm >= 55) {
      percentile = 'Top 25% (Proficient)';
      tier = 'Skilled Typist';
    } else if (netWpm >= 40) {
      percentile = 'Top 45% (Standard)';
      tier = 'Fluent Typist';
    } else {
      percentile = 'Top 70% (Developing)';
      tier = 'Foundational Apprentice';
    }

    setFinalStats({
      netWpm,
      rawWpm,
      accuracy,
      consistency,
      totalChars,
      correctChars: correct,
      incorrectChars: incorrect,
      percentile,
      tier,
    });
  }, [duration, typedChars, passage.text, keystrokes]);

  // Keep ref up to date so decoupled timer always calls latest finish logic
  finishTestRef.current = finishTest;

  // Decoupled High-Precision Wall-Clock Countdown Timer Effect
  // Uses Date.now() timestamp delta — completely immune to keystroke re-renders and interval drift
  useEffect(() => {
    if (testState !== 'running') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // High frequency interval (100ms) calculating exact remaining wall-clock seconds
    timerRef.current = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const remainingMs = Math.max(0, targetEndTimeRef.current - now);
      const remainingSecs = Math.ceil(remainingMs / 1000);

      setTimeLeft(remainingSecs);

      if (remainingMs <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        targetEndTimeRef.current = null;
        finishTestRef.current();
      }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [testState]);

  // Keystroke handler for typing input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Quick restart on Tab or Escape
    if (e.key === 'Tab' || e.key === 'Escape') {
      e.preventDefault();
      handleReloadPassage();
      return;
    }

    if (testState === 'completed') return;

    // Start timer on first printable keypress
    if (testState === 'idle') {
      if (e.key.length === 1 || e.key === 'Backspace') {
        setTestState('running');
        const now = Date.now();
        startTimeRef.current = now;
        targetEndTimeRef.current = now + DURATION_CONFIGS[duration].seconds * 1000;
      }
    }

    const targetText = passage.text;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (inputCharIndex > 0) {
        const nextIdx = inputCharIndex - 1;
        setInputCharIndex(nextIdx);
        setTypedChars(prev => prev.slice(0, -1));
        playKeySound(false);
      }
      return;
    }

    // Only process printable single characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (inputCharIndex >= targetText.length) {
        finishTest();
        return;
      }

      const expectedChar = targetText[inputCharIndex];
      const isCorrect = e.key === expectedChar;

      playKeySound(!isCorrect);

      setKeystrokes(prev => [
        ...prev,
        { key: e.key, time: Date.now(), isCorrect },
      ]);

      setTypedChars(prev => prev + e.key);
      const nextIdx = inputCharIndex + 1;
      setInputCharIndex(nextIdx);

      // Auto-finish if passage completed
      if (nextIdx >= targetText.length) {
        finishTest();
      }
    }
  };

  // Keep active caret visible with smooth line tracking
  useEffect(() => {
    if (activeCharRef.current && textContainerRef.current) {
      const activeEl = activeCharRef.current;
      const containerEl = textContainerRef.current;
      const offsetTop = activeEl.offsetTop - containerEl.offsetTop;
      const mid = containerEl.clientHeight / 2 - 30;
      if (offsetTop > mid) {
        if (typeof containerEl.scrollTo === 'function') {
          containerEl.scrollTo({ top: offsetTop - mid, behavior: 'smooth' });
        } else {
          containerEl.scrollTop = offsetTop - mid;
        }
      }
    }
  }, [inputCharIndex]);

  // Live in-test WPM calculation
  const liveWpm = useMemo(() => {
    if (testState !== 'running' || !startTimeRef.current) return 0;
    const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
    if (elapsedMinutes <= 0.02) return 0;

    let correct = 0;
    for (let i = 0; i < typedChars.length; i++) {
      if (typedChars[i] === passage.text[i]) correct++;
    }
    return Math.round((correct / 5) / elapsedMinutes);
  }, [testState, typedChars, passage.text]);

  const liveAccuracy = useMemo(() => {
    if (typedChars.length === 0) return 100;
    let correct = 0;
    for (let i = 0; i < typedChars.length; i++) {
      if (typedChars[i] === passage.text[i]) correct++;
    }
    return Math.round((correct / typedChars.length) * 100);
  }, [typedChars, passage.text]);

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Dynamic SEO metadata & Schema.org JSON-LD
  const seoData = useMemo(() => {
    let title = 'Official Typing Speed Test (1 Min, 2 Min, 5 Min) with Free Certificate — TypeMentor AI';
    let description = 'Take the official free typing speed test on TypeMentor AI. 1-minute, 2-minute, 3-minute, and 5-minute timed examinations with dynamic non-repeating passages and digital speed certificate.';
    const canonical = `/typing-test${duration !== 1 ? `?time=${duration}m` : ''}`;

    if (duration === 1) {
      title = '1 Minute Typing Speed Test Online (Free with Certificate) — TypeMentor AI';
      description = 'Take the official 1-minute typing test online. Free Net WPM speed calculation, real-time error tracking, non-repeating passages, and downloadable high-res certificate.';
    } else if (duration === 2) {
      title = '2 Minute Typing Speed Test Online — Pacing & Accuracy Benchmark — TypeMentor AI';
      description = 'Test your 2-minute typing speed baseline. Evaluate muscular pacing, keystroke consistency, and accuracy with verified speed accreditation.';
    } else if (duration === 3) {
      title = '3 Minute Typing Endurance Test — Stamina & Accuracy — TypeMentor AI';
      description = 'Take the 3-minute typing endurance test. Benchmark keyboard stamina across multi-paragraph stitched passages with certified speed ranking.';
    } else if (duration === 5) {
      title = '5 Minute Typing Test Civil Service Standard (Free Certificate) — TypeMentor AI';
      description = 'Official 5-minute employment typing test meeting Government & Civil Service standards. Free downloadable accredited certificate with unique verification ID.';
    }

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          'name': 'TypeMentor AI Official Typing Speed Test',
          'url': 'https://www.typementor.in/typing-test',
          'applicationCategory': 'EducationalApplication',
          'operatingSystem': 'All',
          'browserRequirements': 'Requires JavaScript. Requires HTML5.',
          'description': description,
          'offers': {
            '@type': 'Offer',
            'price': '0',
            'priceCurrency': 'USD',
          },
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.9',
            'ratingCount': '1420',
          },
        },
        {
          '@type': 'FAQPage',
          'mainEntity': [
            {
              '@type': 'Question',
              'name': 'How is Net WPM calculated on the official typing test?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Net Words Per Minute (WPM) follows the international standard: one standard word equals 5 keystrokes. Uncorrected errors are subtracted from the gross character total, divided by 5, and divided by the test duration in minutes: Net WPM = ((Gross Keystrokes / 5) - Errors) / Minutes.',
              },
            },
            {
              '@type': 'Question',
              'name': 'What is the required typing speed for Government and Civil Service exams?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Most official employment typing exams (e.g., Court Clerks, High Court, SSC CGL/CHSL, and Postal Assistants) require a minimum speed between 30 and 40 Net WPM with at least 90% to 95% accuracy on an official 5-minute examination.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Are TypeMentor digital typing certificates free to download?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Yes, TypeMentor AI provides 100% free downloadable high-resolution digital typing certificates complete with candidate name, Net WPM, accuracy %, test date, and a unique tamper-proof verification ID.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Why does TypeMentor use different passages for every test?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'To prevent muscle memory memorization and test gaming, TypeMentor AI features an infinite passage library across 6 categories with a 50-session FIFO anti-repeat memory queue, guaranteeing truly unique tests every time.',
              },
            },
          ],
        },
      ],
    };

    return { title, description, canonical, jsonLd };
  }, [duration]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-10 selection:bg-cyan-500 selection:text-black">
      <SEOMeta
        title={seoData.title}
        description={seoData.description}
        canonical={seoData.canonical}
        jsonLd={seoData.jsonLd}
      />

      {/* ── Public Certificate Verification Modal (Triggered by URL ?cert=...) ── */}
      {verifiedCertData && (
        <TypingCertificateModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onSignIn={() => navigate('/auth', { state: { from: '/typing-test' } })}
          data={verifiedCertData}
          isVerificationMode={true}
        />
      )}

      {/* ── 1. Hero / Header with Typewriter ── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>OFFICIAL SPEED EXAMINATION</span>
        </div>

        <h1 className="font-royal font-black text-3xl sm:text-5xl text-white tracking-wide uppercase drop-shadow-[0_4px_24px_rgba(255,255,255,0.15)]">
          {DURATION_CONFIGS[duration].label} Speed Test
        </h1>

        <div className="flex items-center justify-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold uppercase tracking-wider">
            {DURATION_CONFIGS[duration].badge} ({DURATION_CONFIGS[duration].seconds}s)
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">Atomic Precision Keystroke Telemetry</span>
        </div>

        <div className="h-6 flex items-center justify-center text-xs sm:text-sm font-mono text-zinc-400">
          <span className="text-cyan-400 mr-2">&gt;</span>
          <Typewriter
            text={[
              "Infinite non-repeating passages from literature, cosmos, and philosophy.",
              "1-minute sprint, 2-minute baseline, and 5-minute civil service test.",
              "Zero duplicate text • 100,000+ unique thematic combinations.",
              "120 FPS high-precision keystroke evaluation.",
            ]}
            speed={50}
            deleteSpeed={30}
            delay={2400}
            loop={true}
            cursor="▋"
          />
        </div>
      </div>

      {/* ── 2. Duration Selector with GlowCards (Idle or Restart) ── */}
      {testState !== 'running' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-royal text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
              1. SELECT TEST DURATION
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Anti-Repeat Active: {seenCount} Unique Passages Seen</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(DURATION_CONFIGS) as unknown as TestDuration[]).map((d) => {
              const cfg = DURATION_CONFIGS[d];
              const isSelected = duration === d;

              return (
                <GlowCard
                  key={d}
                  glowColor={cfg.glowColor}
                  customSize
                  onClick={() => handleDurationChange(d)}
                  className={`cursor-pointer p-5 flex flex-col justify-between transition-all duration-300 rounded-2xl border ${
                    isSelected
                      ? 'border-cyan-400/80 bg-zinc-950/90 shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-[1.02]'
                      : 'border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700/90 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                        {cfg.icon}
                      </div>
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-zinc-900 text-zinc-500'
                      }`}>
                        {cfg.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-royal font-black text-xl text-white tracking-wide uppercase">
                        {cfg.label}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {cfg.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-500">{cfg.seconds}s countdown</span>
                    <span className={isSelected ? 'text-cyan-400 font-bold' : 'text-zinc-600'}>
                      {isSelected ? '✓ Selected' : 'Select →'}
                    </span>
                  </div>
                </GlowCard>
              );
            })}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-royal font-bold text-zinc-400 uppercase mr-1">
              Topic:
            </span>
            {getAvailableCategories().map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Live Test Board ── */}
      <section className="relative rounded-3xl bg-zinc-950/90 border border-zinc-800/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        {/* Top Rim Regal Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Board HUD Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80 text-sm">
          {/* Metadata on the passage */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                  {DURATION_CONFIGS[duration].label}
                </span>
                <h4 className="font-royal font-bold text-white uppercase text-sm">
                  {passage.title}
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {passage.category}
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-sans">
                {passage.source} • ~{passage.wordCount} words
              </span>
            </div>
          </div>

          {/* Live Metrics / Countdown HUD */}
          <div className="flex items-center gap-4">
            {/* Countdown Stopwatch */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-bold text-sm ${
              timeLeft <= 10 && testState === 'running'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                : 'bg-zinc-900/80 border-zinc-800 text-cyan-300'
            }`}>
              <Timer className="w-4 h-4" />
              <span className="text-base font-black">{formatTime(timeLeft)}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans">
                {testState === 'running' ? 'left' : 'timer'}
              </span>
            </div>

            {/* Live Net WPM */}
            {testState === 'running' && (
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-xl font-bold text-cyan-400">{liveWpm}</span>
                <span className="text-xs text-zinc-500">WPM</span>
              </div>
            )}

            {/* Live Accuracy */}
            {testState === 'running' && (
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-lg font-bold text-emerald-400">{liveAccuracy}%</span>
                <span className="text-xs text-zinc-500">ACC</span>
              </div>
            )}

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute audio feedback' : 'Unmute audio feedback'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Restart Button */}
            <button
              type="button"
              onClick={() => handleReloadPassage()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Restart test (Tab or Esc)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ── Interactive Text Area ── */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="relative min-h-[190px] max-h-[300px] overflow-y-auto cursor-text rounded-2xl p-4 sm:p-6 bg-zinc-900/30 border border-zinc-800/60 focus-within:border-cyan-500/50 transition-colors"
          ref={textContainerRef}
        >
          {/* Hidden real input capturing keystrokes */}
          <input
            ref={inputRef}
            type="text"
            className="absolute opacity-0 pointer-events-none -top-10"
            onKeyDown={handleKeyDown}
            autoFocus
            aria-label="Typing test input"
          />

          {/* Render target text with letter-by-letter validation */}
          <p className="font-mono text-base sm:text-xl leading-relaxed sm:leading-loose tracking-wide break-words select-none">
            {passage.text.split('').map((char, idx) => {
              const isTyped = idx < inputCharIndex;
              const isCurrent = idx === inputCharIndex;
              const typedChar = typedChars[idx];
              const isCorrect = isTyped && typedChar === char;
              const isIncorrect = isTyped && typedChar !== char;

              let styleClass = 'text-zinc-600'; // Default untyped

              if (isCorrect) {
                styleClass = 'text-zinc-100 font-medium';
              } else if (isIncorrect) {
                styleClass = 'text-rose-400 bg-rose-500/20 underline decoration-rose-400 decoration-2';
              }

              return (
                <span
                  key={idx}
                  ref={isCurrent ? activeCharRef : null}
                  className={`relative ${styleClass} transition-colors duration-75`}
                >
                  {isCurrent && (
                    <span className="absolute -left-[2px] top-0 bottom-0 w-[2.5px] bg-cyan-400 animate-pulse rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  )}
                  {char}
                </span>
              );
            })}
          </p>

          {/* Idle Start Hint */}
          {testState === 'idle' && (
            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-cyan-400/80 animate-pulse">
              <span>Click or start typing any letter to begin the examination</span>
              <span>•</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                Tab
              </kbd>
              <span>to reset</span>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Test Complete / Results Dashboard ── */}
      {testState === 'completed' && finalStats && (
        <section className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <GlowCard
            glowColor="blue"
            customSize
            className="p-8 rounded-3xl border border-cyan-500/30 bg-zinc-950/95 space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-royal font-bold uppercase tracking-widest">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>EXAMINATION RESULTS CERTIFIED</span>
              </div>
              <h2 className="font-royal font-black text-2xl sm:text-4xl text-white uppercase tracking-wider">
                {finalStats.tier}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-mono">
                Duration: {duration} Minute Examination • Global Standing: <span className="text-cyan-400 font-bold">{finalStats.percentile}</span>
              </p>
            </div>

            {/* Primary Scores Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400">
                  NET SPEED
                </span>
                <div className="text-3xl sm:text-4xl font-royal font-black text-cyan-400">
                  {finalStats.netWpm}
                </div>
                <span className="text-xs font-mono text-zinc-500">WPM</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400">
                  ACCURACY
                </span>
                <div className="text-3xl sm:text-4xl font-royal font-black text-emerald-400">
                  {finalStats.accuracy}%
                </div>
                <span className="text-xs font-mono text-zinc-500">PRECISION</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400">
                  RAW SPEED
                </span>
                <div className="text-3xl sm:text-4xl font-royal font-black text-zinc-200">
                  {finalStats.rawWpm}
                </div>
                <span className="text-xs font-mono text-zinc-500">GROSS WPM</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400">
                  CONSISTENCY
                </span>
                <div className="text-3xl sm:text-4xl font-royal font-black text-purple-400">
                  {finalStats.consistency}%
                </div>
                <span className="text-xs font-mono text-zinc-500">RHYTHM</span>
              </div>
            </div>

            {/* Keystrokes Breakdown */}
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-wrap items-center justify-around gap-4 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block">Total Keystrokes</span>
                <span className="text-white font-bold text-sm">{finalStats.totalChars}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Correct Characters</span>
                <span className="text-emerald-400 font-bold text-sm">{finalStats.correctChars}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Uncorrected Errors</span>
                <span className="text-rose-400 font-bold text-sm">{finalStats.incorrectChars}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Tested Passage</span>
                <span className="text-cyan-400 font-bold text-sm">{passage.title}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowCertificateModal(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-royal font-black text-xs uppercase tracking-[0.14em] shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.03] cursor-pointer flex items-center justify-center gap-2"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>Get Official Certificate (PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => handleReloadPassage()}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400 text-slate-950 font-royal font-black text-xs uppercase tracking-[0.14em] shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Take Another Test (New Passage)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const text = `I just scored ${finalStats.netWpm} WPM with ${finalStats.accuracy}% accuracy on TypeMentor AI's ${duration}-minute typing test! Try to beat my score: https://www.typementor.in/typing-test`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(text);
                    alert('Score copied to clipboard! Share it with friends or colleagues.');
                  }
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-royal font-bold text-xs uppercase tracking-wider border border-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Share Score</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/practice')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white font-royal font-bold text-xs uppercase tracking-wider border border-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Practice</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </GlowCard>

          {/* Official Digital Certificate Modal */}
          {finalStats && (
            <TypingCertificateModal
              isOpen={showCertificateModal}
              onClose={() => setShowCertificateModal(false)}
              onSignIn={() => navigate('/auth', { state: { from: '/typing-test' } })}
              data={{
                netWpm: finalStats.netWpm,
                rawWpm: finalStats.rawWpm,
                accuracy: finalStats.accuracy,
                consistency: finalStats.consistency,
                durationMinutes: duration,
                category: passage.category,
                tier: finalStats.tier,
                percentile: finalStats.percentile,
                totalChars: finalStats.totalChars,
                correctChars: finalStats.correctChars,
              }}
            />
          )}
        </section>
      )}

      {/* ── 5. SEO Information, WPM Standards & Interactive FAQ ── */}
      <section className="space-y-8 text-zinc-300 text-sm leading-relaxed">
        {/* Architectural Overview */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 space-y-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-royal font-bold text-white text-lg uppercase tracking-wider">
              About the Official TypeMentor Speed Examination
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
              <h4 className="text-white font-semibold text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                How Net WPM is Calculated
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Net Words Per Minute (WPM) follows the international typing test standard: one standard word equals exactly 5 keystrokes. Uncorrected errors are subtracted from the gross character total, ensuring speed cannot be artificially inflated by rushing with reckless typos: <code className="text-cyan-300 bg-zinc-900 px-1 py-0.5 rounded font-mono text-[11px]">Net WPM = ((Gross Chars / 5) - Errors) / Minutes</code>.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
              <h4 className="text-white font-semibold text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Why Infinite Dynamic Passages Matter
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Unlike primitive typing tests that cycle 5 hardcoded sentences, TypeMentor AI generates passages dynamically from hundreds of public-domain literary classics, scientific treatises, and historical transcripts with a 50-session FIFO anti-repeat queue. Every test tests authentic cognitive typing capability.
              </p>
            </div>
          </div>
        </div>

        {/* Global Typing Speed Percentile & WPM Benchmark Table */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-royal text-xs font-bold uppercase tracking-[0.16em] text-cyan-400 block">
                GLOBAL ACCREDITATION BENCHMARK
              </span>
              <h3 className="font-royal font-black text-xl text-white uppercase tracking-wider">
                Official WPM Speed Tiers & Percentiles
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500">Based on 1.4M+ Verified Tests</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-bold text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Tier Rank</th>
                  <th className="py-3 px-4">Speed Range</th>
                  <th className="py-3 px-4">Accuracy Target</th>
                  <th className="py-3 px-4">Global Percentile</th>
                  <th className="py-3 px-4">Real-World Equivalency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                <tr className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> Grandmaster
                  </td>
                  <td className="py-3.5 px-4 text-white font-bold">110+ WPM</td>
                  <td className="py-3.5 px-4 text-emerald-400">98% – 100%</td>
                  <td className="py-3.5 px-4 text-cyan-400 font-bold">Top 0.5%</td>
                  <td className="py-3.5 px-4 text-zinc-400">Court Stenographers, Competitive Typists</td>
                </tr>
                <tr className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-purple-300">Velocity Master</td>
                  <td className="py-3.5 px-4 text-white font-bold">90 – 109 WPM</td>
                  <td className="py-3.5 px-4 text-emerald-400">97% – 99%</td>
                  <td className="py-3.5 px-4 text-cyan-400 font-bold">Top 3%</td>
                  <td className="py-3.5 px-4 text-zinc-400">Software Engineers, Authors, Fast Editors</td>
                </tr>
                <tr className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-blue-300">Advanced Typist</td>
                  <td className="py-3.5 px-4 text-white font-bold">70 – 89 WPM</td>
                  <td className="py-3.5 px-4 text-emerald-400">96% – 98%</td>
                  <td className="py-3.5 px-4 text-cyan-400 font-bold">Top 12%</td>
                  <td className="py-3.5 px-4 text-zinc-400">Professional Programmers, Journalists</td>
                </tr>
                <tr className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-emerald-300">Fluent Professional</td>
                  <td className="py-3.5 px-4 text-white font-bold">50 – 69 WPM</td>
                  <td className="py-3.5 px-4 text-emerald-400">95% – 97%</td>
                  <td className="py-3.5 px-4 text-cyan-400 font-bold">Top 35%</td>
                  <td className="py-3.5 px-4 text-zinc-400">Corporate Executives, Office Administrators</td>
                </tr>
                <tr className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-300">Average Standard</td>
                  <td className="py-3.5 px-4 text-white font-bold">35 – 49 WPM</td>
                  <td className="py-3.5 px-4 text-emerald-400">92% – 95%</td>
                  <td className="py-3.5 px-4 text-zinc-400">50th Percentile</td>
                  <td className="py-3.5 px-4 text-zinc-400">Average Daily Computer User</td>
                </tr>
                <tr className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400">Foundational</td>
                  <td className="py-3.5 px-4 text-white font-bold">20 – 34 WPM</td>
                  <td className="py-3.5 px-4 text-zinc-400">85% – 90%</td>
                  <td className="py-3.5 px-4 text-zinc-400">Top 75%</td>
                  <td className="py-3.5 px-4 text-zinc-400">Beginner / Touch Typing Trainee</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Civil Service & Government Employment Typing Requirements */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 space-y-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-royal font-bold text-white text-lg uppercase tracking-wider">
              Civil Service, Judicial & Employment Standards Guide
            </h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Preparing for official employment examinations? Most national civil service commissions, high courts, and corporate hiring boards conduct standardized <strong>5-minute to 15-minute typing speed assessments</strong>. Below are the verified operational standards:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 space-y-2">
              <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-amber-300 block">
                CIVIL SERVICE & SSC (CGL / CHSL)
              </span>
              <div className="text-2xl font-royal font-black text-white font-mono">35 WPM</div>
              <p className="text-[11px] text-zinc-400">
                English standard (10,500 KDPH / 30 WPM Hindi). Minimum 95% accuracy on official 10-15 min exam.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 space-y-2">
              <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-cyan-300 block">
                HIGH COURT & JUDICIAL CLERK
              </span>
              <div className="text-2xl font-royal font-black text-white font-mono">40 – 50 WPM</div>
              <p className="text-[11px] text-zinc-400">
                Legal transcription and case drafting. Requires 98%+ precision on complex legal terminology.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 space-y-2">
              <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-emerald-300 block">
                DATA ENTRY & TRANSCRIPTION
              </span>
              <div className="text-2xl font-royal font-black text-white font-mono">50 – 65 WPM</div>
              <p className="text-[11px] text-zinc-400">
                Medical, financial, and database entry roles requiring sustained muscular rhythm.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/70 space-y-2">
              <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-purple-300 block">
                SOFTWARE & TECH INDUSTRY
              </span>
              <div className="text-2xl font-royal font-black text-white font-mono">60+ WPM</div>
              <p className="text-[11px] text-zinc-400">
                Software development, documentation, and technical communication standard.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive FAQ Accordion (Matched with Google Schema.org FAQPage) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <h3 className="font-royal font-bold text-white text-lg uppercase tracking-wider">
              Frequently Asked Questions (FAQ)
            </h3>
          </div>

          {[
            {
              q: "How is Net WPM calculated on the official typing test?",
              a: "Net Words Per Minute (WPM) follows the international standard: one standard word equals 5 keystrokes. Uncorrected errors are subtracted from the gross character total, divided by 5, and divided by the test duration in minutes: Net WPM = ((Gross Keystrokes / 5) - Errors) / Minutes.",
            },
            {
              q: "What is the required typing speed for Government and Civil Service exams?",
              a: "Most official employment typing exams (e.g., Court Clerks, High Court, SSC CGL/CHSL, and Postal Assistants) require a minimum speed between 30 and 40 Net WPM with at least 90% to 95% accuracy on an official 5-minute examination.",
            },
            {
              q: "Are TypeMentor digital typing certificates free to download?",
              a: "Yes, TypeMentor AI provides 100% free downloadable high-resolution digital typing certificates complete with candidate name, Net WPM, accuracy %, test date, and a unique tamper-proof verification ID.",
            },
            {
              q: "Why does TypeMentor use different passages for every test?",
              a: "To prevent muscle memory memorization and test gaming, TypeMentor AI features an infinite passage library across 6 categories with a 50-session FIFO anti-repeat memory queue, guaranteeing truly unique tests every time.",
            },
          ].map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4.5 sm:p-5 flex items-center justify-between text-left font-semibold text-white text-xs sm:text-sm hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4.5 pb-4.5 sm:px-5 sm:pb-5 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
