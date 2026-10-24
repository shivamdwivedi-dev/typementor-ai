import { 
  Brain, 
  ArrowLeft, 
  Code2, 
  Target, 
  Cpu, 
  HeartHandshake, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Mail, 
  Github, 
  Activity,
  CheckCircle2,
  Zap,
  Globe2
} from 'lucide-react';
import SEOMeta from '../components/SEOMeta';
import TubesBackground from '../components/ui/neon-flow';

interface AboutUsProps {
  onBack: () => void;
}

interface NeonCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: string;
  ringColor?: string;
  children: React.ReactNode;
  className?: string;
}

function NeonCard({
  title,
  subtitle,
  icon,
  accentColor = 'bg-brand-primary',
  ringColor = 'bg-brand-primary/10 group-hover:bg-brand-primary/20',
  children,
  className = '',
}: NeonCardProps) {
  return (
    <div className={`group [perspective:1000px] w-full ${className}`}>
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 via-brand-bg to-slate-950 p-6 md:p-8 shadow-2xl transition-all duration-500 ease-in-out [transform-style:preserve-3d] group-hover:[box-shadow:rgba(0,0,0,0.5)_24px_36px_30px_-25px,rgba(99,102,241,0.25)_0px_20px_35px_0px]">
        {/* Inner Glass Plate */}
        <div className="absolute inset-2 rounded-[28px] border-b border-l border-white/15 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-sm pointer-events-none" />

        {/* Concentric Neon Rings Top Right */}
        <div className="absolute -right-6 -top-6 pointer-events-none [transform-style:preserve-3d]" aria-hidden="true">
          {[160, 130, 100, 70].map((size, index) => (
            <div
              key={size}
              className={`absolute aspect-square rounded-full ${ringColor} shadow-[-10px_10px_20px_rgba(100,100,111,0.12)] transition-all duration-500 ease-in-out`}
              style={{
                width: `${size}px`,
                top: `${6 + index * 4}px`,
                right: `${6 + index * 4}px`,
                transform: `translate3d(0, 0, ${(index + 1) * 15}px)`,
                transitionDelay: `${index * 80}ms`,
              }}
            />
          ))}
          <div className={`absolute right-[28px] top-[28px] grid aspect-square w-[46px] place-content-center rounded-full border border-white/20 ${accentColor} text-white shadow-[-10px_10px_20px_rgba(100,100,111,0.25)] transition-all duration-500 group-hover:scale-110`}>
            {icon}
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 space-y-4 pr-12 md:pr-16">
          <div className="space-y-1">
            {subtitle && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-primary">
                {subtitle}
              </p>
            )}
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {title}
            </h3>
          </div>
          <div className="text-sm text-slate-300 leading-relaxed space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutUs({ onBack }: AboutUsProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-brand-text select-text space-y-8">
      <SEOMeta
        title="About Us — TypeMentor AI"
        description="Learn about TypeMentor AI, our mission to help developers and writers master touch typing, avoid repetitive strain injury (RSI), and our privacy-first adaptive coaching technology."
        canonical="https://www.typementor.in/about"
      />

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-white transition-colors border border-brand-border px-3.5 py-2 rounded-xl bg-brand-card/25"
      >
        <ArrowLeft className="w-4 h-4" /> Back to App
      </button>

      {/* ── 1. Hero Section with Interactive Tubes Neon Background (Same as Homepage) ── */}
      <section className="relative text-center rounded-[32px] overflow-hidden border border-brand-border/40 shadow-2xl">
        <TubesBackground className="py-14 md:py-20 px-6">
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/40 px-3.5 py-1.5 rounded-full text-brand-primary text-xs font-black tracking-widest uppercase animate-pulse pointer-events-auto">
              <Zap className="w-3.5 h-3.5 fill-brand-primary" />
              <span>About TypeMentor AI</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-[0_0_25px_rgba(0,0,0,0.9)] select-none">
              Typing is the Interface to Thought. <br />
              <span className="bg-gradient-to-r from-brand-primary via-indigo-400 to-brand-success bg-clip-text text-transparent">
                We Make It Frictionless.
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-200 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-md">
              An adaptive, biometric typing coach built specifically for software developers, engineering teams, and writers who spend their careers at the keyboard.
            </p>
          </div>
        </TubesBackground>
      </section>

      {/* ── 2. Mission Neon Card ── */}
      <NeonCard
        title="Our Mission & Philosophy"
        subtitle="Why We Built TypeMentor AI"
        icon={<Sparkles className="w-5 h-5" />}
        accentColor="bg-brand-primary"
      >
        <p>
          Typing is the primary physical interface between human thought and digital execution. Whether you are building distributed systems, writing unit tests, drafting documentation, or reviewing code, the speed and accuracy of your keystrokes determine the fluidity of your day.
        </p>
        <p>
          Conventional typing platforms teach typing on children's nursery rhymes or disjointed word lists with zero resemblance to real programming. More importantly, <strong className="text-white">traditional tests measure your speed, but they never tell you why you made a mistake</strong>.
        </p>
        <p>
          TypeMentor AI replaces mindless repetition with intelligent diagnostic coaching: tracking per-key hold times, transition latencies, and finger confusion patterns to prescribe 2-minute targeted recovery drills.
        </p>
      </NeonCard>

      {/* ── 3. Four Core Pillars Grid in 3D Glass Cards ── */}
      <div className="space-y-3">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-brand-primary" /> Core Technology & Architecture
        </h2>
        <p className="text-xs text-brand-muted">Four architectural cornerstones that power TypeMentor AI's adaptive engine.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeonCard
          title="Adaptive Weak-Key AI"
          subtitle="Precision Diagnostics"
          icon={<Activity className="w-5 h-5" />}
          accentColor="bg-emerald-600"
          ringColor="bg-emerald-500/10 group-hover:bg-emerald-500/20"
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            Every keystroke records millisecond-precision reaction latency and hold time. When your error rate on a specific key (such as <code className="text-white bg-black/40 px-1 rounded">B</code> or <code className="text-white bg-black/40 px-1 rounded">P</code>) exceeds baseline thresholds, the engine dynamically generates custom recovery drills to rebuild subconscious muscle memory.
          </p>
        </NeonCard>

        <NeonCard
          title="Authentic Code Syntax"
          subtitle="Developer-First"
          icon={<Code2 className="w-5 h-5" />}
          accentColor="bg-blue-600"
          ringColor="bg-blue-500/10 group-hover:bg-blue-500/20"
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            Practice real syntax across Python, JavaScript, Java, and SQL. Build natural reflexes for hard-to-reach programming symbols including curly brackets <code className="text-white bg-black/40 px-1 rounded">{'{}'}</code>, arrow functions <code className="text-white bg-black/40 px-1 rounded">=&gt;</code>, conditionals, and logical operators <code className="text-white bg-black/40 px-1 rounded">&amp;&amp;</code>.
          </p>
        </NeonCard>

        <NeonCard
          title="3D WebGL Finger Guide"
          subtitle="Visual Posture"
          icon={<Cpu className="w-5 h-5" />}
          accentColor="bg-purple-600"
          ringColor="bg-purple-500/10 group-hover:bg-purple-500/20"
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            An interactive 3D hand and keyboard model rendered locally in your browser. It teaches proper finger-to-key assignment and home-row placement in real time, eliminating inefficient "hunt-and-peck" habits without requiring camera hardware or privacy-invasive video feeds.
          </p>
        </NeonCard>

        <NeonCard
          title="Multiplayer Arena"
          subtitle="Zero-Latency Matchmaking"
          icon={<Users className="w-5 h-5" />}
          accentColor="bg-amber-600"
          ringColor="bg-amber-500/10 group-hover:bg-amber-500/20"
        >
          <p className="text-xs text-slate-300 leading-relaxed">
            Real-time multiplayer typing battles powered by WebSocket architecture with authoritative server-side timing, connection-limit protection, and automated anti-cheat validation. Compete, wager Arena points, and climb the global developer leaderboard.
          </p>
        </NeonCard>
      </div>

      {/* ── 4. Ergonomics & Health Card ── */}
      <NeonCard
        title="Ergonomics & Hand Health"
        subtitle="Protecting Your Career"
        icon={<HeartHandshake className="w-5 h-5" />}
        accentColor="bg-rose-600"
        ringColor="bg-rose-500/10 group-hover:bg-rose-500/20"
      >
        <p>
          Repetitive Strain Injury (RSI), carpal tunnel syndrome, and tendonitis cause chronic pain for millions of developers worldwide. When typists use improper finger assignments—such as stretching weak index fingers across 4 columns or pounding keys aggressively—they subject delicate wrist tendons to cumulative trauma.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-xs text-slate-200">Balanced load distribution reduces pinky and wrist strain by up to 40%.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-xs text-slate-200">Correct posture eliminates neck-bending and downward keyboard glance fatigue.</span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="text-xs text-slate-200">Consistency score tracking encourages smooth cadence over sporadic hammering.</span>
          </div>
        </div>
      </NeonCard>

      {/* ── 5. Privacy & High-Scale Architecture Card ── */}
      <NeonCard
        title="Engineered for 400,000 Users with Privacy by Design"
        subtitle="Infrastructure & Trust"
        icon={<ShieldCheck className="w-5 h-5" />}
        accentColor="bg-indigo-600"
        ringColor="bg-indigo-500/10 group-hover:bg-indigo-500/20"
      >
        <p>
          TypeMentor AI is built from the ground up to support massive scale without compromising user privacy:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs text-slate-200">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-brand-primary" /> Scalable Cloud Backend
            </p>
            <p className="text-brand-muted leading-relaxed">
              Express.js engine optimized with PostgreSQL connection pooling, indexed database schemas, and response compression architected for 400K concurrent learners.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-success" /> Zero Keystroke Logging
            </p>
            <p className="text-brand-muted leading-relaxed">
              We never log passwords, personal chats, or arbitrary documents. Keystroke analytics are computed locally and strictly for the chosen practice passage.
            </p>
          </div>
        </div>
      </NeonCard>

      {/* ── 6. Creator & Contact Card ── */}
      <NeonCard
        title="Created by Shivam Dwivedi"
        subtitle="Creator & Publisher"
        icon={<Brain className="w-5 h-5" />}
        accentColor="bg-brand-primary"
      >
        <p>
          TypeMentor AI was born out of a desire to create a modern, open learning environment where students and developers can build keyboard mastery without paywalls or restrictive licenses.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-3 text-xs font-semibold">
          <a
            href="mailto:shivamdwivedi.dev@gmail.com"
            className="flex items-center gap-2 text-brand-primary hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl"
          >
            <Mail className="w-4 h-4" /> shivamdwivedi.dev@gmail.com
          </a>
          <a
            href="https://github.com/shivamdwivedi-dev/typementor-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl"
          >
            <Github className="w-4 h-4" /> GitHub Project Repository
          </a>
        </div>
      </NeonCard>

      {/* Footer info */}
      <div className="pt-4 border-t border-brand-border/30 flex flex-wrap items-center justify-between gap-4 text-xs text-brand-muted">
        <p>© 2026 TypeMentor AI. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <a href="/privacy" onClick={(e) => { e.preventDefault(); onBack(); }} className="hover:text-white underline">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="/terms" onClick={(e) => { e.preventDefault(); onBack(); }} className="hover:text-white underline">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
