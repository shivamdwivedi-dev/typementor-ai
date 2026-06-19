import React, { useEffect, useRef } from 'react';

interface WpmPoint {
  time: number; // seconds elapsed
  wpm: number;
}

interface LiveWpmGraphProps {
  points: WpmPoint[];
  personalBest: number;
  height?: number;
}

const LiveWpmGraph: React.FC<LiveWpmGraphProps> = ({ points, personalBest, height = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (points.length < 2) {
      // Draw empty grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      return;
    }

    const maxWpm = Math.max(personalBest, ...points.map(p => p.wpm), 60);
    const maxTime = Math.max(points[points.length - 1].time, 30);

    const toX = (t: number) => (t / maxTime) * w;
    const toY = (wpm: number) => h - (wpm / maxWpm) * h;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Personal best dashed line
    if (personalBest > 0) {
      const pbY = toY(personalBest);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(234,179,8,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, pbY);
      ctx.lineTo(w, pbY);
      ctx.stroke();
      ctx.setLineDash([]);
      // Label
      ctx.fillStyle = 'rgba(234,179,8,0.7)';
      ctx.font = '9px monospace';
      ctx.fillText(`PB ${personalBest}`, 4, pbY - 3);
    }

    // WPM line gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(6,182,212,0.3)');
    grad.addColorStop(1, 'rgba(6,182,212,0)');

    ctx.beginPath();
    ctx.moveTo(toX(points[0].time), toY(points[0].wpm));
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (toX(prev.time) + toX(curr.time)) / 2;
      ctx.bezierCurveTo(cpx, toY(prev.wpm), cpx, toY(curr.wpm), toX(curr.time), toY(curr.wpm));
    }
    ctx.lineTo(toX(points[points.length - 1].time), h);
    ctx.lineTo(toX(points[0].time), h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // WPM line stroke
    ctx.beginPath();
    ctx.moveTo(toX(points[0].time), toY(points[0].wpm));
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (toX(prev.time) + toX(curr.time)) / 2;
      ctx.bezierCurveTo(cpx, toY(prev.wpm), cpx, toY(curr.wpm), toX(curr.time), toY(curr.wpm));
    }
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current WPM dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(toX(last.time), toY(last.wpm), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

  }, [points, personalBest]);

  const currentWpm = points.length > 0 ? Math.round(points[points.length - 1].wpm) : 0;

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/5 bg-gray-900/60">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs text-gray-500 font-mono">Live WPM</span>
        <span className="text-sm font-black text-cyan-400 font-mono">{currentWpm} wpm</span>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};

export default LiveWpmGraph;
