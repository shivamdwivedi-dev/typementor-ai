import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music, Settings, Info, BrainCircuit, RotateCcw } from 'lucide-react';
import { soundEngine, SoundPack } from '../utils/soundEngine';

export default function SoundSettings() {
  const [enabled, setEnabled] = useState(soundEngine.isEnabled());
  const [volume, setVolume] = useState(Math.round(soundEngine.getVolume() * 100));
  const [pack, setPack] = useState<SoundPack>(soundEngine.getSoundPack());
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const toggleSound = () => {
    const next = !enabled;
    setEnabled(next);
    soundEngine.setEnabled(next);
    soundEngine.initCtx();
    soundEngine.play('key');
  };

  const toggleCoach = () => {
    const next = !coachEnabled;
    setCoachEnabled(next);
    localStorage.setItem('typementor_ai_coach_pulses', String(next));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = parseInt(e.target.value);
    setVolume(nextVol);
    soundEngine.setVolume(nextVol / 100);
  };

  const selectPack = (nextPack: SoundPack) => {
    setPack(nextPack);
    soundEngine.setSoundPack(nextPack);
    soundEngine.initCtx();
    setTimeout(() => {
      soundEngine.play('key');
    }, 50);
  };

  // Re-sync with actual state if loaded later
  useEffect(() => {
    setEnabled(soundEngine.isEnabled());
    setVolume(Math.round(soundEngine.getVolume() * 100));
    setPack(soundEngine.getSoundPack());
    setCoachEnabled(localStorage.getItem('typementor_ai_coach_pulses') !== 'false');
  }, [isOpen]);

  return (
    <div className="relative text-left font-sans z-30">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-brand-card/45 hover:bg-brand-card/75 border border-brand-border/40 hover:border-brand-primary/60 rounded-xl text-xs font-bold text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
        aria-label="Sound Settings"
      >
        {enabled && pack !== 'Silent' ? (
          <Volume2 className="w-4 h-4 text-brand-primary animate-pulse" />
        ) : (
          <VolumeX className="w-4 h-4 text-brand-muted" />
        )}
        <span className="hidden sm:inline">Settings</span>
      </button>

      {/* Settings Modal Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3.5 w-76 sm:w-80 bg-brand-bg/95 border border-brand-border rounded-2xl glass-panel p-5 shadow-2xl z-50 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-brand-border/20 pb-3 mb-4">
              <div className="flex items-center gap-2 text-white">
                <Settings className="w-4.5 h-4.5 text-brand-primary" />
                <h4 className="font-extrabold text-sm tracking-wide">Sound & Coach Settings</h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-brand-muted hover:text-white font-extrabold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Keyboard Sound Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text/95">Keyboard Click Sound</span>
                <button
                  onClick={toggleSound}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none ${
                    enabled ? 'bg-brand-primary' : 'bg-brand-card/80 border border-brand-border/40'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-brand-text/95">
                  <span>Volume</span>
                  <span className="font-mono text-brand-primary">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  disabled={!enabled}
                  className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-brand-primary disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>

              {/* Sound Packs List */}
              <div className="space-y-2 border-b border-brand-border/20 pb-3">
                <span className="text-xs font-bold text-brand-text/95 flex items-center gap-1.5">
                  <Music className="w-4 h-4 text-brand-primary" />
                  Sound Profiles
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mechanical', 'Laptop', 'Typewriter', 'Silent'] as SoundPack[]).map(p => (
                    <button
                      key={p}
                      disabled={!enabled && p !== 'Silent'}
                      onClick={() => selectPack(p)}
                      className={`px-3 py-2 text-[10.5px] font-bold rounded-xl border text-center transition-all focus:outline-none focus:ring-1 focus:ring-brand-primary ${
                        pack === p
                          ? 'bg-brand-primary text-slate-950 border-brand-primary font-black shadow-lg shadow-brand-primary/15'
                          : 'bg-brand-card/25 border-brand-border/40 text-brand-muted hover:text-white hover:border-brand-primary/40 disabled:opacity-40 disabled:hover:text-brand-muted disabled:hover:border-brand-border/40'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Coach Pulse Toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-brand-text/95 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-brand-primary animate-pulse" />
                  AI Coach Pulses
                </span>
                <button
                  onClick={toggleCoach}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none ${
                    coachEnabled ? 'bg-brand-primary' : 'bg-brand-card/80 border border-brand-border/40'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      coachEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Info hint */}
              <div className="bg-brand-primary/5 border border-brand-primary/10 p-2.5 rounded-xl text-[10px] text-brand-muted flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Toggle smart, real-time coaching suggestions. Pulses are non-blocking and automatically fade after 6s.
                </p>
              </div>

              {/* Onboarding Tour Button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  localStorage.removeItem('typementor_onboarding_completed');
                  window.dispatchEvent(new CustomEvent('restart_typementor_tour'));
                }}
                className="w-full py-2 bg-brand-card hover:bg-brand-border/40 border border-brand-border/40 hover:border-brand-primary/60 text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-primary" />
                Restart Onboarding Tour
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
