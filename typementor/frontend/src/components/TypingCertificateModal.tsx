import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/AuthStore';
import { useBodyScrollLock } from '../utils/scrollLock';
import {
  Download,
  Share2,
  X,
  Sparkles,
  ShieldCheck,
  Crown,
  Copy,
  ExternalLink,
} from 'lucide-react';

export interface CertificateData {
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  durationMinutes: number;
  category: string;
  tier: string;
  percentile: string;
  totalChars: number;
  correctChars: number;
  testDate?: string;
  certificateId?: string;
}

export interface TypingCertificateModalProps {
  isOpen: boolean;
  data: CertificateData;
  onClose: () => void;
  onSignIn?: () => void;
}

// Generate deterministic verification ID
function generateCertId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TM-2026-${rand}`;
}

export default function TypingCertificateModal({
  isOpen,
  data,
  onClose,
  onSignIn,
}: TypingCertificateModalProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [candidateName, setCandidateName] = useState<string>(() => {
    return user?.name || (user?.email ? user.email.split('@')[0] : 'Speed Typist');
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [certId] = useState<string>(() => data.certificateId || generateCertId());
  const [formattedDate] = useState<string>(() => {
    if (data.testDate) return data.testDate;
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  useBodyScrollLock(isOpen);

  // Sync candidate name if user logs in
  useEffect(() => {
    if (user?.name && (!candidateName || candidateName === 'Speed Typist')) {
      setCandidateName(user.name);
    }
  }, [user, candidateName]);

  // Keyboard navigation: Escape closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // High-Resolution 1920x1080 Canvas Certificate Renderer
  const renderCertificateToCanvas = useCallback((): HTMLCanvasElement | null => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background: Rich Deep Dark Space
    const bgGradient = ctx.createLinearGradient(0, 0, 1920, 1080);
    bgGradient.addColorStop(0, '#060913');
    bgGradient.addColorStop(0.5, '#0a101f');
    bgGradient.addColorStop(1, '#040710');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1920, 1080);

    // Ambient Cyan & Gold Glow Orbs
    const glow1 = ctx.createRadialGradient(250, 200, 10, 250, 200, 500);
    glow1.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
    glow1.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 1920, 1080);

    const glow2 = ctx.createRadialGradient(1670, 880, 10, 1670, 880, 500);
    glow2.addColorStop(0, 'rgba(245, 158, 11, 0.10)');
    glow2.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, 1920, 1080);

    // Ornate Metallic Gold Double Borders
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 1800, 960);

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(80, 80, 1760, 920);

    // Corner Filigrees / Accents
    const corners = [
      { x: 60, y: 60, dx: 1, dy: 1 },
      { x: 1860, y: 60, dx: -1, dy: 1 },
      { x: 60, y: 1020, dx: 1, dy: -1 },
      { x: 1860, y: 1020, dx: -1, dy: -1 },
    ];
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    corners.forEach(c => {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * 40);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x + c.dx * 40, c.y);
      ctx.stroke();
    });

    // Header Emblem
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Cinzel", "Outfit", sans-serif';
    ctx.fillStyle = '#06b6d4';
    ctx.letterSpacing = '8px';
    ctx.fillText('TYPEMENTOR AI  •  OFFICIAL ACCREDITATION', 960, 160);

    // Main Title: Royal Bold
    ctx.font = '900 48px "Cinzel", "Syne", serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CERTIFICATE OF TYPING PROFICIENCY', 960, 240);

    // Subtitle Line
    ctx.font = '400 20px "Outfit", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('This official credential certifies that', 960, 310);

    // Candidate Name
    ctx.font = 'bold 56px "Outfit", "Syne", sans-serif';
    const nameGrad = ctx.createLinearGradient(600, 380, 1320, 380);
    nameGrad.addColorStop(0, '#ffffff');
    nameGrad.addColorStop(0.5, '#67e8f9');
    nameGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = nameGrad;
    ctx.fillText(candidateName || 'Speed Typist', 960, 390);

    // Underline beneath candidate name
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(660, 420);
    ctx.lineTo(1260, 420);
    ctx.stroke();

    // Achievement Description
    ctx.font = '400 22px "Outfit", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    const desc = `has demonstrated outstanding tactile agility and cognitive pacing during the official`;
    ctx.fillText(desc, 960, 475);
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(
      `${data.durationMinutes}-Minute Speed Examination (${data.tier})`,
      960,
      515
    );

    // Metrics Showcase Cards (4 pill-boxes)
    const metrics = [
      { label: 'NET SPEED', value: `${data.netWpm} WPM`, sub: 'Official Net Rate', color: '#06b6d4' },
      { label: 'ACCURACY', value: `${data.accuracy}%`, sub: 'Tactile Precision', color: '#10b981' },
      { label: 'RAW SPEED', value: `${data.rawWpm} WPM`, sub: 'Gross Velocity', color: '#94a3b8' },
      { label: 'CONSISTENCY', value: `${data.consistency}%`, sub: 'Cadence Rhythm', color: '#a855f7' },
    ];

    const boxWidth = 320;
    const boxHeight = 150;
    const boxSpacing = 36;
    const totalBoxesWidth = 4 * boxWidth + 3 * boxSpacing;
    const startX = (1920 - totalBoxesWidth) / 2;
    const boxY = 570;

    metrics.forEach((m, idx) => {
      const bx = startX + idx * (boxWidth + boxSpacing);

      // Box Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(bx, boxY, boxWidth, boxHeight, 16);
      ctx.fill();

      // Box Border
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Metric Label
      ctx.font = 'bold 13px "Cinzel", "Outfit", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.letterSpacing = '2px';
      ctx.fillText(m.label, bx + boxWidth / 2, boxY + 36);

      // Metric Value
      ctx.font = '900 42px "Outfit", "JetBrains Mono", sans-serif';
      ctx.fillStyle = m.color;
      ctx.fillText(m.value, bx + boxWidth / 2, boxY + 90);

      // Metric Sub
      ctx.font = '400 12px "Outfit", sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(m.sub, bx + boxWidth / 2, boxY + 124);
    });

    // Verification ID, Date & Security Stamp
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`VERIFICATION ID: ${certId}`, 180, 830);

    ctx.font = '400 15px "Outfit", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Issued On: ${formattedDate}`, 180, 860);
    ctx.fillText(`Global Benchmark: ${data.percentile}`, 180, 885);
    ctx.fillText(`Standard: 5 Keystrokes per Word • Zero Error Margin Tolerance`, 180, 910);

    // Official Gold Seal & Signature on Right
    ctx.textAlign = 'center';

    // Gold Seal Outer Circle
    const sealX = 1620;
    const sealY = 860;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sealX, sealY, 65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sealX, sealY, 57, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 11px "Cinzel", serif';
    ctx.fillStyle = '#f59e0b';
    ctx.letterSpacing = '1px';
    ctx.fillText('★ OFFICIAL ★', sealX, sealY - 20);
    ctx.font = '900 13px "Outfit", sans-serif';
    ctx.fillText('VERIFIED', sealX, sealY + 2);
    ctx.font = 'bold 10px "Outfit", sans-serif';
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('TYPEMENTOR', sealX, sealY + 22);

    // Bottom verification URL
    ctx.textAlign = 'center';
    ctx.font = '400 14px "Outfit", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Verify online at typementor.in/typing-test  •  Authentic Digital Signature Hash', 960, 990);

    return canvas;
  }, [candidateName, data, certId, formattedDate]);

  // Handle Download PNG
  const handleDownloadPng = async () => {
    setIsGeneratingPng(true);
    try {
      const canvas = renderCertificateToCanvas();
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `TypeMentor_Certificate_${data.netWpm}WPM_${certId}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // Handle Share to LinkedIn
  const handleShareLinkedIn = () => {
    const text = encodeURIComponent(
      `🎯 Officially certified at ${data.netWpm} WPM with ${data.accuracy}% accuracy in the TypeMentor AI ${data.durationMinutes}-Minute Typing Examination! Standing: ${data.percentile}. Verified ID: ${certId}.`
    );
    const url = encodeURIComponent('https://www.typementor.in/typing-test');
    window.open(
      `https://www.linkedin.com/feed/?shareActive=true&text=${text}%20${url}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Handle Share to Twitter/X
  const handleShareTwitter = () => {
    const tweet = encodeURIComponent(
      `⚡ Just certified at ${data.netWpm} WPM (${data.accuracy}% accuracy) on @TypeMentor AI's official ${data.durationMinutes}-min typing exam! Can you beat my score?\n\nhttps://www.typementor.in/typing-test`
    );
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank', 'noopener,noreferrer');
  };

  // Copy Verification Link
  const handleCopyLink = () => {
    const text = `https://www.typementor.in/typing-test?cert=${certId}&wpm=${data.netWpm}&acc=${data.accuracy}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          onClick={onClose}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-2xl select-none overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl my-auto bg-zinc-950/95 border border-zinc-800/90 rounded-3xl p-5 sm:p-7 shadow-[0_25px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(6,182,212,0.18)] text-zinc-100 overflow-hidden"
          >
            {/* Top Border Regal Highlight */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            {/* Modal Header */}
            <div className="flex items-center justify-between w-full mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-royal font-bold tracking-widest uppercase">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>OFFICIAL SPEED ACCREDITATION</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Certificate Visual Preview Box */}
            <div className="relative rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-zinc-900/90 via-slate-950 to-zinc-950 p-5 sm:p-7 shadow-inner text-center space-y-4 overflow-hidden">
              {/* Inner Decorative Golden Border */}
              <div className="absolute inset-2 rounded-xl border border-amber-400/20 pointer-events-none" />

              {/* Watermark Logo */}
              <div className="text-[10px] font-royal font-bold uppercase tracking-[0.25em] text-cyan-400">
                TYPEMENTOR AI CERTIFIED SPEED EVALUATION
              </div>

              <h3 className="font-royal font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
                CERTIFICATE OF TYPING PROFICIENCY
              </h3>

              <p className="text-xs text-zinc-400 font-sans">
                This authentic digital credential certifies that
              </p>

              {/* Editable Candidate Name */}
              <div className="inline-flex items-center justify-center gap-2">
                {isEditingName ? (
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    autoFocus
                    placeholder="Enter Candidate Name"
                    className="px-3 py-1 rounded-lg bg-zinc-900 border border-cyan-400 text-white font-bold text-lg text-center outline-none"
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingName(true)}
                    className="group flex items-center gap-2 cursor-pointer"
                    title="Click to change candidate name"
                  >
                    <span className="font-royal font-black text-2xl sm:text-3xl text-cyan-300 tracking-wide underline decoration-cyan-500/40 underline-offset-4 group-hover:text-cyan-200 transition-colors">
                      {candidateName || 'Speed Typist'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">
                      (edit)
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-zinc-300 max-w-lg mx-auto font-sans leading-relaxed">
                has officially completed the <strong className="text-amber-400">{data.durationMinutes}-Minute Speed Examination</strong> ({data.tier}) with verified tactile accuracy.
              </p>

              {/* Verified Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                  <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400 block">
                    NET SPEED
                  </span>
                  <span className="text-2xl font-royal font-black text-cyan-400 font-mono">
                    {data.netWpm}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block">WPM</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                  <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400 block">
                    PRECISION
                  </span>
                  <span className="text-2xl font-royal font-black text-emerald-400 font-mono">
                    {data.accuracy}%
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block">ACCURACY</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                  <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400 block">
                    RAW SPEED
                  </span>
                  <span className="text-2xl font-royal font-black text-zinc-200 font-mono">
                    {data.rawWpm}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block">GROSS WPM</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                  <span className="text-[10px] font-royal font-bold uppercase tracking-wider text-zinc-400 block">
                    CONSISTENCY
                  </span>
                  <span className="text-2xl font-royal font-black text-purple-400 font-mono">
                    {data.consistency}%
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block">RHYTHM</span>
                </div>
              </div>

              {/* Certificate Verification Badge Strip */}
              <div className="pt-2 flex flex-wrap items-center justify-between text-left text-[11px] font-mono text-zinc-400 border-t border-zinc-800/80">
                <div>
                  <span className="text-zinc-500 block text-[10px]">VERIFICATION ID</span>
                  <span className="text-amber-400 font-bold">{certId}</span>
                </div>

                <div>
                  <span className="text-zinc-500 block text-[10px]">ISSUE DATE</span>
                  <span className="text-zinc-300">{formattedDate}</span>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-400 font-sans text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Tamper-Proof Accredited</span>
                </div>
              </div>
            </div>

            {/* Guest Capture Banner if user not authenticated */}
            {!isAuthenticated && (
              <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-zinc-200">
                  <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>
                    <strong className="text-white">Save to Permanent Profile:</strong> Sign in free to lock this certificate into the global leaderboard!
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onSignIn}
                  className="whitespace-nowrap px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  1-Click Google Sign-In
                </button>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isGeneratingPng}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-slate-950 font-royal font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:scale-[1.02] cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>{isGeneratingPng ? 'Generating...' : 'Download PNG (High-Res)'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareLinkedIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-[#0077b5]/20 hover:bg-[#0077b5]/30 border border-[#0077b5]/40 text-[#0077b5] font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Post on LinkedIn</span>
              </button>

              <button
                type="button"
                onClick={handleShareTwitter}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-royal font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span>Post on X / Twitter</span>
              </button>
            </div>

            {/* Copy Verification Link Footer */}
            <div className="mt-3.5 flex items-center justify-center gap-2 text-xs text-zinc-400">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>{copiedLink ? '✓ Certificate link copied!' : 'Copy Verification Link'}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
