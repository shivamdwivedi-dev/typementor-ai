import { useEffect, useMemo, useState } from 'react';

interface KeyboardHeatmapProps {
  keyUsage?: Record<string, number>;
  keyMistakes?: Record<string, number>;
  weakKeys?: Record<string, number>;
  riskKeys?: Record<string, number>;
  mode: 'usage' | 'mistakes' | 'risk';
}

const ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
];

export default function KeyboardHeatmap({
  keyUsage = {},
  keyMistakes = {},
  weakKeys = {},
  riskKeys = {},
  mode
}: KeyboardHeatmapProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedKey(null);
    setHoveredKey(null);
  }, [mode]);

  // Helper to calculate key heat colors
  const getKeyStyle = (key: string) => {
    const keyUpper = key.toUpperCase();
    
    if (mode === 'usage') {
      const count = keyUsage[keyUpper] || 0;
      if (count === 0) return 'bg-brand-card text-brand-muted';
      // Scale color based on usage
      if (count < 10) return 'bg-indigo-950 text-indigo-200 border-indigo-900/50';
      if (count < 50) return 'bg-indigo-900 text-indigo-100 border-indigo-800/50';
      if (count < 100) return 'bg-indigo-700 text-white border-indigo-600/50 shadow-sm shadow-indigo-700/20';
      return 'bg-brand-primary text-white border-indigo-500 shadow-md shadow-brand-primary/30';
    } 
    
    if (mode === 'mistakes') {
      const count = keyMistakes[keyUpper] || 0;
      if (count === 0) return 'bg-brand-card text-brand-muted';
      // Scale color based on mistakes
      if (count < 5) return 'bg-red-950/80 text-red-200 border-red-900/50';
      if (count < 15) return 'bg-red-900/90 text-red-100 border-red-800/50';
      if (count < 30) return 'bg-red-700 text-white border-red-650';
      return 'bg-brand-danger text-white border-red-500 shadow-md shadow-brand-danger/30';
    }

    if (mode === 'risk') {
      const probability = riskKeys[keyUpper] || 0;
      if (probability === 0) return 'bg-brand-card text-brand-muted';
      // Scale based on predicted error probability
      if (probability < 30) return 'bg-amber-950 text-amber-200 border-amber-900/50';
      if (probability < 60) return 'bg-amber-900 text-amber-100 border-amber-800/50';
      if (probability < 80) return 'bg-amber-600 text-white border-amber-500';
      return 'bg-brand-warning text-white border-amber-400 shadow-md shadow-brand-warning/30';
    }

    return 'bg-brand-card';
  };

  const getKeyStats = (key: string) => {
    const keyUpper = key.toUpperCase();
    const usage = keyUsage[keyUpper] || 0;
    const mistakes = keyMistakes[keyUpper] || 0;
    const errorRate = weakKeys[keyUpper] ? Math.round(weakKeys[keyUpper] * 100) : 0;
    const risk = riskKeys[keyUpper] ? Math.round(riskKeys[keyUpper]) : 0;

    return { usage, mistakes, errorRate, risk };
  };

  const selectedStats = selectedKey ? getKeyStats(selectedKey) : null;
  const metricLabel = mode === 'usage' ? 'times typed' : mode === 'mistakes' ? 'mistakes' : 'risk score';
  const metricValue = (key: string) => {
    const stats = getKeyStats(key);
    return mode === 'usage' ? stats.usage : mode === 'mistakes' ? stats.mistakes : stats.risk;
  };
  const maxMetric = useMemo(
    () => Math.max(1, ...ROWS.flat().map(metricValue), metricValue(' ')),
    [keyUsage, keyMistakes, weakKeys, riskKeys, mode]
  );
  const activeKey = selectedKey || hoveredKey;

  return (
    <div className="w-full relative select-none">
      {/* Keyboard Grid */}
      <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 space-y-2 relative">
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5 md:gap-2">
            {rowIndex === 3 && (
              <div className="w-10 bg-brand-card/30 border border-brand-border/20 rounded-lg flex items-center justify-center text-[10px] text-brand-muted font-bold font-mono">
                Shift
              </div>
            )}
            
            {row.map((key) => {
              const style = getKeyStyle(key);
              const stats = getKeyStats(key);
              // Calculate boundary-aware tooltip placement classes
              const isTopRow = rowIndex <= 1; // First 2 rows (numbers and QWERTY)
              const keyIndex = row.indexOf(key);
              const isRightColumn = keyIndex >= row.length - 2;
              const isLeftColumn = keyIndex <= 1;

              let tooltipPositionClass = "absolute bottom-full mb-3 left-1/2 -translate-x-1/2";
              if (isTopRow) {
                // Near top edge: place tooltip below the key
                if (isRightColumn) {
                  tooltipPositionClass = "absolute top-full mt-3 right-0 translate-x-0";
                } else if (isLeftColumn) {
                  tooltipPositionClass = "absolute top-full mt-3 left-0 translate-x-0";
                } else {
                  tooltipPositionClass = "absolute top-full mt-3 left-1/2 -translate-x-1/2";
                }
              } else {
                // Normal keys: place tooltip above the key
                if (isRightColumn) {
                  tooltipPositionClass = "absolute bottom-full mb-3 right-0 translate-x-0";
                } else if (isLeftColumn) {
                  tooltipPositionClass = "absolute bottom-full mb-3 left-0 translate-x-0";
                } else {
                  tooltipPositionClass = "absolute bottom-full mb-3 left-1/2 -translate-x-1/2";
                }
              }

              return (
                <button
                  key={key}
                  type="button"
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onFocus={() => setHoveredKey(key)}
                  onBlur={() => setHoveredKey(null)}
                  onClick={() => setSelectedKey(selectedKey === key ? null : key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setSelectedKey(null);
                  }}
                  aria-pressed={selectedKey === key}
                  aria-label={`${key} key statistics: ${stats.usage} typed, ${stats.mistakes} mistakes, ${stats.errorRate}% error rate`}
                  className={`w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 border border-brand-border/40 rounded-lg flex flex-col items-center justify-center font-bold font-mono text-xs sm:text-sm transition-all duration-200 cursor-pointer relative ${style} ${
                    activeKey === key ? 'scale-105 z-10 border-white ring-1 ring-white/20' : ''
                  }`}
                >
                  <span>{key}</span>
                  
                  {/* Tooltip Popup */}
                  {activeKey === key && (
                    <div className={`${tooltipPositionClass} bg-slate-950 border border-brand-border p-3 rounded-xl shadow-2xl z-50 w-44 text-left pointer-events-none`}>
                      <div className="font-extrabold text-sm text-white mb-1.5 border-b border-brand-border/50 pb-1 flex items-center justify-between">
                        <span>Key "{key}"</span>
                        <span className="text-[10px] px-1 bg-brand-card rounded text-brand-primary">Stats</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-brand-muted">
                        <div className="flex justify-between">
                          <span>Total Typed:</span>
                          <span className="text-white font-mono">{stats.usage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mistakes:</span>
                          <span className="text-brand-danger font-mono font-semibold">{stats.mistakes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Rate:</span>
                          <span className="text-brand-warning font-mono font-semibold">{stats.errorRate}%</span>
                        </div>
                        {stats.risk > 0 && (
                          <div className="flex justify-between border-t border-brand-border/30 pt-1 mt-1">
                            <span>Predicted Risk:</span>
                            <span className="text-brand-warning font-mono font-bold">{stats.risk}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
            
            {rowIndex === 3 && (
              <div className="w-10 bg-brand-card/30 border border-brand-border/20 rounded-lg flex items-center justify-center text-[10px] text-brand-muted font-bold font-mono">
                Shift
              </div>
            )}
          </div>
        ))}
        
        {/* Spacebar row */}
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onMouseEnter={() => setHoveredKey('Space')}
            onMouseLeave={() => setHoveredKey(null)}
            onFocus={() => setHoveredKey('Space')}
            onBlur={() => setHoveredKey(null)}
            onClick={() => setSelectedKey(selectedKey === ' ' ? null : ' ')}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSelectedKey(null);
            }}
            aria-pressed={selectedKey === ' '}
            aria-label={`Spacebar statistics: ${getKeyStats(' ').usage} typed, ${getKeyStats(' ').mistakes} mistakes, ${getKeyStats(' ').errorRate}% error rate`}
            className={`w-36 sm:w-56 md:w-80 h-7 sm:h-10 md:h-12 border border-brand-border/40 rounded-lg flex items-center justify-center font-bold font-mono text-xs sm:text-sm transition-all duration-200 cursor-pointer relative ${getKeyStyle(' ')} ${
              activeKey === ' ' || activeKey === 'Space' ? 'scale-105 z-10 border-white ring-1 ring-white/20' : ''
            }`}
          >
            <span>SPACEBAR</span>
            {(activeKey === ' ' || activeKey === 'Space') && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-950 border border-brand-border p-3 rounded-xl shadow-2xl z-50 w-44 text-left pointer-events-none">
                <div className="font-extrabold text-sm text-white mb-1.5 border-b border-brand-border/50 pb-1">
                  Spacebar
                </div>
                <div className="space-y-1 text-[11px] text-brand-muted">
                  <div className="flex justify-between">
                    <span>Total Typed:</span>
                    <span className="text-white font-mono">{getKeyStats(' ').usage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mistakes:</span>
                    <span className="text-brand-danger font-mono font-semibold">{getKeyStats(' ').mistakes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className="text-brand-warning font-mono font-semibold">{getKeyStats(' ').errorRate}%</span>
                  </div>
                </div>
              </div>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-xl border border-brand-border/30 bg-brand-bg/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-brand-muted">
            <span className="font-bold uppercase tracking-wider text-white">Intensity</span>
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-brand-card border border-brand-border/40" />Low</span>
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-brand-primary" />High</span>
            <span className="text-brand-border">•</span>
            <span>Click a key to pin its details</span>
          </div>
          {selectedStats && selectedKey && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono">
              <span className="text-white font-bold">Key {selectedKey === ' ' ? 'SPACE' : `"${selectedKey}"`}</span>
              <span className="text-brand-primary">{selectedStats.usage} typed</span>
              <span className="text-brand-danger">{selectedStats.mistakes} mistakes</span>
              <span className="text-brand-warning">{selectedStats.errorRate}% error</span>
              <span className="text-brand-muted">{Math.round((metricValue(selectedKey) / maxMetric) * 100)}% {metricLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
