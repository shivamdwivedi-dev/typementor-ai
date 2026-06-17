import { X, AlertTriangle } from 'lucide-react';

interface MobileKeyboardWarningProps {
  onClose: () => void;
}

export default function MobileKeyboardWarning({ onClose }: MobileKeyboardWarningProps) {
  // Save dismissal in sessionStorage so it doesn't pop up again in the same browser tab session
  const handleDismiss = () => {
    sessionStorage.setItem('mobile_keyboard_warning_dismissed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 modal-3d-perspective animate-fade-in">
      <div className="relative w-full max-w-md glass-panel p-8 rounded-3xl border border-brand-border/40 shadow-2xl overflow-hidden modal-3d-content flex flex-col items-center">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-warning/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close button with 3D press effect */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-brand-muted hover:text-white transition-all p-2 rounded-xl hover:bg-white/5 hover:scale-110 active:scale-90 active:translate-y-0.5 border border-transparent hover:border-white/10"
          aria-label="Close warning"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 3D Isometric Floating Keyboard SVG */}
        <div className="w-full flex justify-center mb-6 mt-2">
          <svg className="w-40 h-28 float-3d-keyboard drop-shadow-[0_20px_35px_rgba(245,158,11,0.25)]" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="kbBase" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            {/* Glowing base shadow outline */}
            <polygon points="10,95 105,35 185,55 90,115" fill="none" stroke="url(#accentGlow)" strokeWidth="2" opacity="0.6" />

            {/* Keyboard main body (3D slab) */}
            {/* Top Plate */}
            <polygon points="12,90 107,30 187,50 92,110" fill="url(#kbBase)" stroke="#334155" strokeWidth="1" />
            {/* Left side depth */}
            <polygon points="12,90 92,110 92,118 12,98" fill="#0f172a" />
            {/* Right side depth */}
            <polygon points="92,110 187,50 187,58 92,118" fill="#020617" stroke="#1e293b" strokeWidth="0.5" />

            {/* Colored Accent strip on the edge */}
            <polygon points="15,90 92,109 92,112 15,93" fill="url(#accentGlow)" />

            {/* Keycaps layers (3D blocks on top plate) */}
            {/* Spacebar */}
            <polygon points="70,95 85,85 105,90 90,100" fill="#f59e0b" />
            <polygon points="70,95 90,100 90,102 70,97" fill="#d97706" />
            <polygon points="90,100 105,90 105,92 90,102" fill="#b45309" />

            {/* Esc Key (Glowing Red) */}
            <polygon points="28,70 33,67 38,69 33,72" fill="#ef4444" />
            <polygon points="28,70 33,72 33,74 28,72" fill="#dc2626" />
            <polygon points="33,72 38,69 38,71 33,74" fill="#b91c1c" />

            {/* Standard Key Clusters (Isometric blocks) */}
            {/* Row 1 */}
            <polygon points="45,62 55,56 65,59 55,65" fill="#334155" />
            <polygon points="70,48 80,42 90,45 80,51" fill="#334155" />
            <polygon points="95,34 105,28 115,31 105,37" fill="#334155" />
            {/* Row 2 */}
            <polygon points="50,75 62,68 72,71 60,78" fill="#475569" />
            <polygon points="78,59 90,52 100,55 88,62" fill="#475569" />
            <polygon points="106,43 118,37 128,40 116,47" fill="#475569" />
            {/* Row 3 */}
            <polygon points="85,73 97,66 107,69 95,76" fill="#475569" />
            <polygon points="112,58 124,51 134,54 122,61" fill="#475569" />
            <polygon points="140,42 152,36 162,39 150,46" fill="#334155" />
            {/* Row 4 */}
            <polygon points="118,72 130,65 140,68 128,75" fill="#334155" />
            <polygon points="146,56 158,49 168,52 156,59" fill="#334155" />
          </svg>
        </div>

        {/* Warning Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-warning/10 border border-brand-warning/20 text-brand-warning text-xs font-bold uppercase tracking-wider mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Mobile Device Detected</span>
        </div>

        {/* Content */}
        <h3 className="text-xl font-extrabold text-white text-center tracking-tight mb-3">
          Physical Keyboard Recommended
        </h3>
        <p className="text-sm text-brand-muted text-center leading-relaxed mb-6">
          TypeMentor AI is a biometric and telemetry typing coach. Touchscreen keyboards cannot capture critical keystroke dynamics (hold times, flight transition speed, and finger positioning).
          <br /><br />
          For the best training experience and biometric accuracy, please connect an external **USB or Bluetooth keyboard**.
        </p>

        {/* Actions with 3D press animation */}
        <button
          onClick={handleDismiss}
          className="w-full py-3 px-5 rounded-2xl bg-brand-warning hover:bg-brand-warning/90 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg hover:shadow-brand-warning/20 active:translate-y-0.5 hover:-translate-y-0.5"
        >
          I have a physical keyboard connected
        </button>
        <button
          onClick={handleDismiss}
          className="w-full mt-3 py-2 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium text-xs tracking-wide transition-all border border-white/5 active:translate-y-0.5"
        >
          Proceed in Guest Mode anyway
        </button>
      </div>
    </div>
  );
}
