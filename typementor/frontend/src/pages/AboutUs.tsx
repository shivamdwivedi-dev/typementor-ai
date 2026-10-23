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
  CheckCircle2
} from 'lucide-react';
import SEOMeta from '../components/SEOMeta';

interface AboutUsProps {
  onBack: () => void;
}

export default function AboutUs({ onBack }: AboutUsProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-brand-text select-text">
      <SEOMeta
        title="About Us — TypeMentor AI"
        description="Learn about TypeMentor AI, our mission to help developers and writers master touch typing, avoid repetitive strain injury (RSI), and our privacy-first adaptive coaching technology."
        canonical="https://typementor-ai-frontend.vercel.app/about"
      />

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-white transition-colors border border-brand-border px-3.5 py-2 rounded-xl bg-brand-card/25 mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to App
      </button>

      <div className="glass-panel p-8 md:p-12 rounded-3xl border border-brand-border/50 bg-gradient-to-b from-brand-card/30 to-brand-bg space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-brand-border/30 pb-6">
          <div className="bg-brand-primary/10 p-3.5 rounded-2xl text-brand-primary shadow-lg shadow-brand-primary/10">
            <Brain className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              About TypeMentor <span className="text-brand-primary">AI</span>
            </h1>
            <p className="text-xs text-brand-muted uppercase tracking-wider font-semibold mt-1">
              Adaptive Keystroke Biometrics & AI-Powered Typing Coach
            </p>
          </div>
        </div>

        {/* Mission Statement */}
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/15 text-brand-primary border border-brand-primary/25">
            <Sparkles className="w-3.5 h-3.5" /> Our Mission
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Democratizing Developer Speed & Keyboard Ergonomics
          </h2>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            Typing is the primary physical interface between human thought and digital execution. Whether you are writing Python algorithms, deploying SQL queries, drafting documentation, or chatting in Slack, the speed and accuracy of your keystrokes dictate the friction of your workflow.
          </p>
          <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
            TypeMentor AI was created to solve a fundamental problem: <strong className="text-white">conventional typing tests only measure speed, but they never diagnose why you make mistakes</strong>. Traditional tools test you on nursery rhymes or random word lists that have zero resemblance to real programming syntax. TypeMentor AI replaces rote repetition with adaptive AI coaching, targeted weak-key recovery drills, and developer-grade syntax practice.
          </p>
        </section>

        {/* Core Pillars */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-primary" /> What Makes TypeMentor AI Different
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-brand-card/40 border border-brand-border/40 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Activity className="w-4 h-4 text-emerald-400" />
                Adaptive Weak-Key Detection
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                Our keystroke analytics engine measures reaction latency, key-hold duration, and mistake frequencies for every individual finger and row. If you consistently struggle with the <code className="text-white bg-black/40 px-1 rounded">B</code> or <code className="text-white bg-black/40 px-1 rounded">P</code> key, the AI generates custom recovery drills specifically for those keys.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-brand-card/40 border border-brand-border/40 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Code2 className="w-4 h-4 text-blue-400" />
                Real-World Coding Syntax
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                Practice typing authentic syntax in Python, JavaScript, Java, and SQL. Master difficult symbol combinations like curly braces <code className="text-white bg-black/40 px-1 rounded">{'{}'}</code>, brackets <code className="text-white bg-black/40 px-1 rounded">[]</code>, arrows <code className="text-white bg-black/40 px-1 rounded">=&gt;</code>, and logical operators <code className="text-white bg-black/40 px-1 rounded">&amp;&amp;</code> that trip up programmers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-brand-card/40 border border-brand-border/40 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Cpu className="w-4 h-4 text-purple-400" />
                Interactive 3D Finger Guide
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                A real-time WebGL 3D hand and keyboard visualization demonstrates precise finger-to-key assignments. It enforces home-row discipline, preventing "hunt-and-peck" habits without requiring camera tracking or privacy-invasive hardware.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-brand-card/40 border border-brand-border/40 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Users className="w-4 h-4 text-amber-400" />
                Real-Time Multiplayer Arena
              </div>
              <p className="text-xs text-brand-muted leading-relaxed">
                Compete head-to-head with other developers in real-time WebSocket battles. Backed by authoritative server-side timing and anti-cheat validation, Arena matches test typing speed and composure under pressure.
              </p>
            </div>
          </div>
        </section>

        {/* Ergonomics & Health */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-rose-400" /> Ergonomics & Preventing Wrist Strain
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Repetitive Strain Injury (RSI), carpal tunnel syndrome, and tendonitis plague millions of computer professionals. Improper finger positioning—such as stretching weak fingers across multiple columns or resting wrists directly on desk edges—creates cumulative physical microtrauma.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="flex items-start gap-2 text-xs text-brand-muted">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Balanced finger load distribution reduces pinky strain by up to 40%.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-brand-muted">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Correct home-row posture eliminates neck-bending and monitor-glance fatigue.</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-brand-muted">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Fluid rhythm and consistency score tracking prevents aggressive keystroke pounding.</span>
            </div>
          </div>
        </section>

        {/* Privacy & Technology */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" /> Architecture & Privacy by Design
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            TypeMentor AI is engineered with modern, cloud-native technology built for scale and privacy:
          </p>
          <ul className="text-xs text-brand-muted space-y-2 list-disc list-inside">
            <li><strong className="text-white">Frontend:</strong> React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Three.js WebGL rendering.</li>
            <li><strong className="text-white">Backend & Scale:</strong> Node.js, Express, PostgreSQL with Prisma ORM, PgBouncer connection pooling, and in-memory TTL caching architected to comfortably support 400,000+ active users.</li>
            <li><strong className="text-white">Privacy Guarantee:</strong> Keystroke analytics are computed locally and in aggregate. We never store private text, passwords, or personal chat data. Your data is never sold to third-party data brokers.</li>
          </ul>
        </section>

        {/* Creator & Contact */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-brand-primary/10 via-brand-card/40 to-transparent border border-brand-primary/20 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center font-bold text-white text-base">
              SD
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Created by Shivam Dwivedi</h3>
              <p className="text-xs text-brand-muted">Software Engineer & Creator of TypeMentor AI</p>
            </div>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            TypeMentor AI began as an open passion project to create a better, syntax-aware typing tool for engineering teams and students. We believe high-quality educational software should be accessible to everyone worldwide for free.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold">
            <a
              href="mailto:shivamdwivedi.dev@gmail.com"
              className="flex items-center gap-1.5 text-brand-primary hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4" /> shivamdwivedi.dev@gmail.com
            </a>
            <span className="text-brand-border">•</span>
            <a
              href="https://github.com/shivamdwivedi-dev/typementor-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <Github className="w-4 h-4" /> GitHub Repository
            </a>
          </div>
        </section>

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
    </div>
  );
}
