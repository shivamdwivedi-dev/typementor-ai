import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Crown,
  Crosshair,
  Keyboard,
  Shield,
  Clock,
  Trophy,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface ConquestTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  badge: string;
  icon: React.ReactNode;
  content: string;
  highlights: string[];
  visual: React.ReactNode;
}

export const ConquestTutorialModal: React.FC<ConquestTutorialModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      title: 'Your Mission: Conquer the Capital',
      badge: 'Step 1: The Objective',
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      content:
        'Word Conquest is a real-time multiplayer strategy game on a 6×6 tactical realm. You command your home Citadel. Your ultimate objective is to breach enemy lines and capture your opponent’s Capital Citadel.',
      highlights: [
        'Blue Citadel starts at Northern Fortress (0, 0)',
        'Red Citadel starts at Southern Fortress (5, 5)',
        'Capturing the enemy Capital awards instant VICTORY!',
      ],
      visual: (
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-around gap-4 text-center">
          <div className="p-3 rounded-xl bg-blue-950/70 border border-blue-500/50 flex flex-col items-center gap-1.5 shadow-lg shadow-blue-500/10">
            <Crown className="w-6 h-6 text-blue-400" />
            <span className="text-xs font-bold text-blue-300">Blue Capital</span>
            <span className="text-[10px] font-mono text-zinc-400">(0, 0)</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-black uppercase text-purple-400 tracking-wider">VS</span>
            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-rose-500 rounded-full" />
            <span className="text-[10px] text-zinc-500 font-medium">36 Territories</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 flex flex-col items-center gap-1.5 shadow-lg shadow-rose-500/10">
            <Crown className="w-6 h-6 text-rose-400" />
            <span className="text-xs font-bold text-rose-300">Red Capital</span>
            <span className="text-[10px] font-mono text-zinc-400">(5, 5)</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Choose a Target: Adjacent Tiles',
      badge: 'Step 2: Tactical Expansion',
      icon: <Crosshair className="w-5 h-5 text-emerald-400" />,
      content:
        'You can only attack territories that share an edge (North, South, East, West) with territory you already control. Legal targetable tiles are highlighted with emerald targeting reticles.',
      highlights: [
        'Orthogonal expansion: North, South, East, West only (no diagonal skips)',
        'Click any highlighted target to launch an attack challenge',
        'You cannot attack territories you already own',
      ],
      visual: (
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex flex-col items-center gap-2">
          <div className="grid grid-cols-3 gap-2 w-48 aspect-square">
            <div className="rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
              Blocked
            </div>
            <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/80 flex flex-col items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20 animate-pulse">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-bold">Target</span>
            </div>
            <div className="rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
              Blocked
            </div>
            <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/80 flex flex-col items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20 animate-pulse">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-bold">Target</span>
            </div>
            <div className="rounded-lg bg-blue-950/80 border border-blue-500/80 flex flex-col items-center justify-center text-blue-300">
              <Crown className="w-4 h-4 text-blue-400" />
              <span className="text-[8px] font-bold">Your Citadel</span>
            </div>
            <div className="rounded-lg bg-emerald-950/50 border border-emerald-500/80 flex flex-col items-center justify-center text-emerald-300 shadow-md shadow-emerald-500/20 animate-pulse">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-bold">Target</span>
            </div>
          </div>
          <span className="text-[11px] text-zinc-400">Emerald reticles show legal targets</span>
        </div>
      ),
    },
    {
      title: 'Fight with Typing: Accuracy & Speed',
      badge: 'Step 3: Combat Mechanics',
      icon: <Keyboard className="w-5 h-5 text-purple-400" />,
      content:
        'Battles are fought through real-time typing challenges. When you select a tile, a combat drawer opens with the target passage. Type the passage accurately into the battle zone before the 75-second countdown expires.',
      highlights: [
        'Green characters indicate correct keystrokes; red indicates typos',
        'Your live typing progress is streamed in real time to the opponent',
        'Auto-submits when passage is completed, or click "Submit Assault"',
      ],
      visual: (
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-purple-500/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-purple-300 font-bold">Assault in Progress</span>
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 75s
            </span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs leading-relaxed">
            <span className="text-emerald-400 font-bold">The vanguard advanced </span>
            <span className="text-rose-400 bg-rose-500/20 underline">throuh</span>
            <span className="text-purple-400 animate-pulse font-bold">|</span>
            <span className="text-zinc-500"> the misty fortress gates...</span>
          </div>
          <div className="flex justify-between text-[11px] text-zinc-400 pt-1">
            <span>Req: 90% Accuracy</span>
            <span className="text-emerald-400 font-bold">Live Pacing Enforced</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Territory Difficulty Tiers',
      badge: 'Step 4: Realm Topology',
      icon: <Shield className="w-5 h-5 text-blue-400" />,
      content:
        'Not all territories are equal. Difficulty scales with territory importance, requiring longer passages and stricter accuracy.',
      highlights: [
        'Neutral Territory: EASY (~90% accuracy, short passage)',
        'Fortress Bastion: MEDIUM (~93% accuracy, +2 defense modifier)',
        'Enemy Territory: HARD (~95% accuracy, reconquest challenge)',
        'Enemy Capital: EXPERT (~97% accuracy, +5 defense, citadel siege)',
      ],
      visual: (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-300">Neutral</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Easy</span>
            </div>
            <p className="text-[11px] text-zinc-400">Fast expansion, 90% acc</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300">Fortress</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Med (+2)</span>
            </div>
            <p className="text-[11px] text-zinc-400">Defended bastion, 93% acc</p>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-300">Enemy Tile</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">Hard</span>
            </div>
            <p className="text-[11px] text-zinc-400">Hostile territory, 95% acc</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-300">Capital</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">Expert (+5)</span>
            </div>
            <p className="text-[11px] text-zinc-400">Final siege, 97% acc</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Incoming Attacks & Defense',
      badge: 'Step 5: Incoming Threats',
      icon: <Zap className="w-5 h-5 text-amber-400" />,
      content:
        'When an opponent attacks your territory, a high-priority alert triggers immediately. Because friendly tiles cannot be typed on directly, defense in Word Conquest is an asymmetric race: launch an immediate counter-assault or finish your active challenge before the attacker captures your ground!',
      highlights: [
        'Real-time alert banner shows attacker, target tile, and remaining time',
        'Click "DEFEND NOW" to focus your active assault or jump to the map to counter-attack',
        'Anti-paste macros are prohibited (<250 WPM strictly enforced by server)',
      ],
      visual: (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                Incoming Attack Alert!
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
              Tile: (1, 0)
            </span>
          </div>
          <p className="text-xs text-amber-200/90 leading-snug">
            Opponent is assaulting your territory! Race to complete your assault or counter-attack before time runs out.
          </p>
          <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Authoritative server timer</span>
            <span className="text-amber-300 font-bold font-mono">75s Window</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Victory Conditions',
      badge: 'Step 6: Winning the War',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
      content:
        'There are two ways to achieve victory in Word Conquest:',
      highlights: [
        '1. Capital Conquest: Breach through adjacent territory and successfully capture the enemy’s Capital Citadel.',
        '2. Disconnect Forfeit: If an opponent disconnects and fails to reconnect within the 30-second grace window, you win by forfeit.',
        'Post-match results display the full 36-territory realm partition and performance breakdown.',
      ],
      visual: (
        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-300">
              Total Realm Victory
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Capital Citadel Captured or Opponent Disconnected
            </p>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Keyboard navigation: Left/Right arrows and Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight') {
        if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) setCurrentStep((prev) => prev - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [isOpen, currentStep, steps.length, onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6 overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-52 h-52 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Badge, Step Indicator & Close */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {step.icon}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                {step.badge}
              </span>
              <span className="text-xs text-zinc-400">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close tutorial"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors border border-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title & Content */}
        <div className="space-y-3 relative z-10">
          <h3
            id="tutorial-modal-title"
            className="text-xl sm:text-2xl font-black text-white tracking-tight"
          >
            {step.title}
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed">{step.content}</p>
        </div>

        {/* Step Visual Preview */}
        <div className="relative z-10">{step.visual}</div>

        {/* Key Highlights Bullet points */}
        <div className="space-y-1.5 relative z-10">
          {step.highlights.map((point, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{point}</span>
            </div>
          ))}
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-2 pt-2 relative z-10">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              aria-label={`Go to step ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-6 bg-purple-500'
                  : 'w-1.5 bg-zinc-800 hover:bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Bottom Actions: Skip, Prev, Next */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-900 relative z-10">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center gap-1 border border-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/30"
            >
              <span>{currentStep === steps.length - 1 ? 'Got it — Enter Battle' : 'Next'}</span>
              {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
