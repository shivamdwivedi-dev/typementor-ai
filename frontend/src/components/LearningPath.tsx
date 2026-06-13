import { useState, useEffect, useCallback } from 'react';
import { Award, CheckCircle2, Circle, Code, Star, Lock, Zap } from 'lucide-react';
import { useTypingStore } from '../store/TypingStore';

interface PathNode {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  mode: string;
  text: string;
  xpReward: number;
  requiredWpm: number;
  requiredAccuracy: number;
  icon: React.ReactNode;
}

const NODES: PathNode[] = [
  {
    id: 'n1',
    title: 'Home Row Warmup',
    description: 'Master ASDFGHJKL keystroke reaches with both hands.',
    difficulty: 1,
    mode: 'English',
    text: 'asdfg hjkl; asdfg hjkl; add fall glad flask shall dash ask glad',
    xpReward: 50,
    requiredWpm: 0,
    requiredAccuracy: 0,
    icon: <Circle className="w-5 h-5" />,
  },
  {
    id: 'n2',
    title: 'Top Row Reaches',
    description: 'Practice QWERTY reaches — index and ring fingers.',
    difficulty: 2,
    mode: 'English',
    text: 'quit week exit row top your port quiet written type upward point',
    xpReward: 100,
    requiredWpm: 20,
    requiredAccuracy: 85,
    icon: <Star className="w-5 h-5 text-brand-warning" />,
  },
  {
    id: 'n3',
    title: 'Common Digraph Drills',
    description: 'Drill TR, TH, ER, SH — the most frequent English pairs.',
    difficulty: 3,
    mode: 'English',
    text: 'the try tree write third story target consistent character through shelter',
    xpReward: 150,
    requiredWpm: 30,
    requiredAccuracy: 88,
    icon: <Award className="w-5 h-5 text-brand-primary" />,
  },
  {
    id: 'n4',
    title: 'Programming Brace Blocks',
    description: 'Get comfortable with brackets, quotes, and braces.',
    difficulty: 4,
    mode: 'JavaScript',
    text: 'const verify = (a, b) => { return [a, b]; };\nconst map = (fn, arr) => arr.map((x) => fn(x));',
    xpReward: 200,
    requiredWpm: 40,
    requiredAccuracy: 90,
    icon: <Code className="w-5 h-5" />,
  },
  {
    id: 'n5',
    title: 'SQL Query Speed',
    description: 'Speed-type complex database keywords and column names.',
    difficulty: 5,
    mode: 'SQL',
    text: 'SELECT id, email, wpm FROM users INNER JOIN sessions ON users.id = sessions.user_id WHERE accuracy > 90;',
    xpReward: 250,
    requiredWpm: 50,
    requiredAccuracy: 92,
    icon: <TrophyIcon className="w-5 h-5" />,
  },
  {
    id: 'n6',
    title: 'Speed Burst Challenge',
    description: 'High-cadence sentences — push past your comfort zone.',
    difficulty: 5,
    mode: 'English',
    text: 'velocity without accuracy is noise but accuracy without velocity is merely caution dressed up as skill',
    xpReward: 350,
    requiredWpm: 60,
    requiredAccuracy: 94,
    icon: <Zap className="w-5 h-5 text-brand-warning" />,
  },
];

function TrophyIcon({ className }: { className?: string }) {
  return <Award className={`${className} stroke-[2.5]`} />;
}

const STORAGE_KEY = 'typementor_completed_nodes';

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveCompleted(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

interface XPToast {
  nodeId: string;
  xp: number;
}

interface LearningPathProps {
  currentLevel?: number;
  onSelectNode: () => void;
}

export default function LearningPath({ currentLevel = 1, onSelectNode }: LearningPathProps) {
  const { initializeSession, wpm, accuracy, isCompleted } = useTypingStore();
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(loadCompleted);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<XPToast | null>(null);

  // When a session completes, check if the active node's requirements were met
  useEffect(() => {
    if (!isCompleted || !activeNodeId) return;

    const node = NODES.find(n => n.id === activeNodeId);
    if (!node) return;

    const metRequirements = wpm >= node.requiredWpm && accuracy >= node.requiredAccuracy;

    if (metRequirements && !completedNodes.has(node.id)) {
      const next = new Set(completedNodes);
      next.add(node.id);
      setCompletedNodes(next);
      saveCompleted(next);
      setXpToast({ nodeId: node.id, xp: node.xpReward });
      setTimeout(() => setXpToast(null), 3500);
    }
  }, [isCompleted]);

  const handleNodeClick = useCallback((node: PathNode) => {
    const unlockedLevel = currentLevel + completedNodes.size;
    if (node.difficulty > unlockedLevel + 1) return;

    initializeSession(node.text, node.mode, node.difficulty);
    setActiveNodeId(node.id);
    onSelectNode();
  }, [completedNodes, currentLevel, initializeSession, onSelectNode]);

  return (
    <div className="w-full max-w-lg mx-auto py-10 relative">
      {/* XP unlock toast */}
      {xpToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-brand-warning text-slate-950 font-black text-sm px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Node Complete! +{xpToast.xp} XP earned
          </div>
        </div>
      )}

      <div className="text-center mb-10">
        <h3 className="text-2xl font-black text-white tracking-tight">AI Learning Roadmap</h3>
        <p className="text-brand-muted text-xs sm:text-sm mt-1.5">
          Complete each node to unlock the next. Progress is saved locally.
        </p>
        <div className="mt-3 text-xs text-brand-muted">
          <span className="text-brand-success font-bold">{completedNodes.size}</span>
          <span> / {NODES.length} nodes completed</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8 px-4">
        <div className="w-full h-2 bg-brand-card rounded-full overflow-hidden border border-brand-border/40">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-success rounded-full transition-all duration-700"
            style={{ width: `${(completedNodes.size / NODES.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-12">
        {/* Vertical connector */}
        <div className="absolute top-10 bottom-10 w-[3px] bg-brand-border/40 left-1/2 -translate-x-1/2 -z-10" />

        {NODES.map((node) => {
          const isNodeCompleted = completedNodes.has(node.id);
          const unlockedLevel = currentLevel + completedNodes.size;
          const isLocked = node.difficulty > unlockedLevel + 1;
          const isActive = activeNodeId === node.id;

          let btnClass = 'bg-brand-card text-brand-muted border-brand-border/40 cursor-not-allowed opacity-50';

          if (isNodeCompleted) {
            btnClass = 'bg-brand-success/15 text-brand-success border-brand-success/30 hover:bg-brand-success/25 cursor-pointer';
          } else if (!isLocked) {
            btnClass = isActive
              ? 'bg-brand-primary text-white border-brand-primary cursor-pointer shadow-lg shadow-brand-primary/30 ring-4 ring-brand-primary/20 animate-pulse'
              : 'bg-brand-card text-white border-brand-border hover:bg-brand-primary/20 hover:border-brand-primary/50 cursor-pointer transition-all';
          }

          return (
            <div key={node.id} className="relative flex flex-col items-center w-full group">
              <button
                onClick={() => !isLocked && handleNodeClick(node)}
                disabled={isLocked}
                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 ${btnClass}`}
              >
                {isNodeCompleted
                  ? <CheckCircle2 className="w-6 h-6" />
                  : isLocked
                    ? <Lock className="w-5 h-5" />
                    : node.icon}
              </button>

              <div className="mt-3 bg-brand-card/85 border border-brand-border/40 p-4 rounded-2xl w-72 text-center shadow-xl backdrop-blur-md transition-all group-hover:border-brand-primary/50">
                <span className="text-xs font-black text-white flex items-center justify-center gap-1.5">
                  Level {node.difficulty}: {node.title}
                  {isNodeCompleted && (
                    <span className="text-[8px] bg-brand-success/10 text-brand-success px-1.5 py-0.5 rounded uppercase tracking-widest font-black">
                      Done
                    </span>
                  )}
                  {isLocked && (
                    <span className="text-[8px] bg-brand-border px-1 py-0.5 rounded uppercase tracking-widest text-brand-muted">
                      Locked
                    </span>
                  )}
                </span>
                <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">{node.description}</p>

                {!isLocked && !isNodeCompleted && (
                  <div className="mt-2 text-[9px] text-brand-muted flex justify-center gap-3">
                    <span>Need: <span className="text-white font-mono font-bold">{node.requiredWpm} WPM</span></span>
                    <span>+<span className="text-white font-mono font-bold">{node.requiredAccuracy}%</span> acc</span>
                  </div>
                )}

                <div className="flex justify-between items-center mt-3 border-t border-brand-border/20 pt-2 text-[9px] font-mono font-bold text-brand-muted">
                  <span>Mode: {node.mode}</span>
                  <span className="text-brand-warning">+{node.xpReward} XP</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
