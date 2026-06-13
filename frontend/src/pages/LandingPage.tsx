import { Brain, Award, Activity, Flame, ShieldCheck, BookOpen, ChevronRight, Zap, BarChart2, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onTryAcademy: () => void;
  onNavigateToPage?: (page: 'privacy' | 'terms') => void;
}

export default function LandingPage({ onGetStarted, onTryAcademy, onNavigateToPage }: LandingPageProps) {
  return (
    <div className="w-full space-y-24 py-10 pb-20">
      
      {/* ── 1. Hero Section ── */}
      <section className="relative text-center max-w-4xl mx-auto space-y-8 px-4 py-12 md:py-20 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute top-10 left-10 w-[200px] h-[200px] bg-brand-success/5 rounded-full blur-[80px] pointer-events-none -z-10"></div>

        <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 px-3.5 py-1.5 rounded-full text-brand-primary text-xs font-black tracking-widest uppercase animate-pulse">
          <Zap className="w-3.5 h-3.5 fill-brand-primary" />
          <span>Beta Version 1.0 Live</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
          Type Smarter. <br />
          <span className="bg-gradient-to-r from-brand-primary via-indigo-400 to-brand-success bg-clip-text text-transparent">
            Improve Faster.
          </span>
        </h1>

        <p className="text-base md:text-lg text-brand-muted max-w-2xl mx-auto font-medium leading-relaxed">
          An AI-powered typing coach that teaches, analyzes, and improves your typing. Build muscle memory through smart lessons targeted directly at your weak keys.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary/90 text-white font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all text-sm flex items-center justify-center gap-2 border border-indigo-400/40"
          >
            <span>Get Started</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onTryAcademy}
            className="w-full sm:w-auto bg-brand-card hover:bg-brand-card/85 text-brand-success font-extrabold px-8 py-4 rounded-2xl border border-brand-success/30 hover:border-brand-success/50 shadow-md transition-all text-sm flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Try Typing Academy (Guest)</span>
          </button>
        </div>
      </section>

      {/* ── 2. Feature Cards Section ── */}
      <section className="space-y-10 px-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Advanced Platform Features</h2>
          <p className="text-brand-muted text-xs md:text-sm uppercase tracking-wider font-bold">Engineered for extreme performance and analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 hover:border-brand-primary/40 transition-all duration-300 group hover:-translate-y-1">
            <div className="bg-brand-primary/10 text-brand-primary p-3 rounded-xl w-fit border border-brand-primary/20 mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Typing Academy</h3>
            <p className="text-brand-muted text-xs leading-relaxed">
              Structured learning pathways for all skill levels from home row basics to complex coding syntax. Level up systematically.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 hover:border-brand-primary/40 transition-all duration-300 group hover:-translate-y-1">
            <div className="bg-brand-danger/10 text-brand-danger p-3 rounded-xl w-fit border border-brand-danger/20 mb-4 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">AI Weak-Key Recovery</h3>
            <p className="text-brand-muted text-xs leading-relaxed">
              Real-time mistake tracking detects your confusion patterns and designs custom syllable-building lessons to target problem keys.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 hover:border-brand-primary/40 transition-all duration-300 group hover:-translate-y-1">
            <div className="bg-brand-primary/10 text-brand-primary p-3 rounded-xl w-fit border border-brand-primary/20 mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Endurance Arena</h3>
            <p className="text-brand-muted text-xs leading-relaxed">
              Push your stamina limits in raw time modes with real-time biometric focus metrics and speed stability profiling graphs.
            </p>
          </div>

          {/* Card 4 */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 hover:border-brand-primary/40 transition-all duration-300 group hover:-translate-y-1">
            <div className="bg-brand-warning/10 text-brand-warning p-3 rounded-xl w-fit border border-brand-warning/20 mb-4 group-hover:scale-110 transition-transform">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">XP & Streaks</h3>
            <p className="text-brand-muted text-xs leading-relaxed">
              Gamify your practice schedule. Maintain daily streaks, score experience points (XP) for performance, and unlock achievements.
            </p>
          </div>

          {/* Card 5 */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 hover:border-brand-primary/40 transition-all duration-300 group hover:-translate-y-1">
            <div className="bg-brand-success/10 text-brand-success p-3 rounded-xl w-fit border border-brand-success/20 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Google Login</h3>
            <p className="text-brand-muted text-xs leading-relaxed">
              Synchronize your typing telemetry history automatically. Safe authentication preserves your analytics profile forever.
            </p>
          </div>

          {/* Card 6 */}
          <div className="glass-panel p-6 rounded-2xl border border-brand-border/40 hover:border-brand-primary/40 transition-all duration-300 group hover:-translate-y-1">
            <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-xl w-fit border border-indigo-400/20 mb-4 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-lg mb-2">Certificates</h3>
            <p className="text-brand-muted text-xs leading-relaxed">
              Earn and share beautiful credentials to validate your typing speed, accuracy limits, and layout mastery with employers.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Who It Is For ── */}
      <section className="space-y-10 px-4 py-8 bg-brand-card/10 border-y border-brand-border/30">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Who Is TypeMentor For?</h2>
          <p className="text-brand-muted text-xs md:text-sm uppercase tracking-wider font-bold">Tailored analytics engine for any typing goal</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { title: 'Students', desc: 'Accelerate essay writing, report compilation, and daily learning layouts.' },
            { title: 'Coders', desc: 'Master bracket spacing, special character symbols, and syntax speed drills.' },
            { title: 'Writers', desc: 'Eliminate mechanical drag between creative concepts and text output streams.' },
            { title: 'Steno Learners', desc: 'Train muscle coordination baseline layouts before introducing shorthand theories.' },
            { title: 'Competitive Typists', desc: 'Analyze keystroke telemetry down to the millisecond to squeeze out speed.' },
            { title: 'Typing Institutes', desc: 'Validate cohort progress records with standardized analytics scoring dashboards.' }
          ].map((item, idx) => (
            <div key={idx} className="flex gap-4 p-4 bg-brand-card/20 border border-brand-border/25 rounded-2xl">
              <div className="text-brand-primary mt-1">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-white text-sm mb-1">{item.title}</h4>
                <p className="text-brand-muted text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Trust/Preview Section (Dashboard Previews) ── */}
      <section className="space-y-10 px-4 max-w-6xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">First-Class Telemetry Previews</h2>
          <p className="text-brand-muted text-xs md:text-sm uppercase tracking-wider font-bold">Get a glimpse of the analytics inside the app</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card A: Dashboard Metrics Preview */}
          <div className="glass-panel p-6 rounded-3xl border border-brand-border/50 bg-gradient-to-b from-brand-card/30 to-brand-bg space-y-5 text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-brand-border/30 pb-3">
                <span className="text-[10px] bg-brand-primary/10 text-brand-primary font-black px-2 py-0.5 rounded tracking-wider uppercase">Sample Dashboard Preview</span>
                <BarChart2 className="w-4 h-4 text-brand-primary" />
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30 text-left">
                    <span className="text-[9px] text-brand-muted uppercase font-extrabold block">Avg Speed</span>
                    <span className="text-2xl font-black text-brand-primary font-mono block mt-1">78 WPM</span>
                  </div>
                  <div className="bg-brand-bg/50 p-3 rounded-xl border border-brand-border/30 text-left">
                    <span className="text-[9px] text-brand-muted uppercase font-extrabold block">Accuracy</span>
                    <span className="text-2xl font-black text-brand-success font-mono block mt-1">98.4%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-brand-muted uppercase font-bold">Daily Streak Goal</span>
                    <span className="text-white font-extrabold">3 / 3 Completed</span>
                  </div>
                  <div className="w-full bg-brand-card rounded-full h-2 overflow-hidden border border-brand-border/40">
                    <div className="bg-brand-warning h-full w-full rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-brand-muted mt-4">
              Real-time telemetry compiles lifetime speed records and captures character frequency rates automatically.
            </p>
          </div>

          {/* Card B: Weak-Key Recovery Report */}
          <div className="glass-panel p-6 rounded-3xl border border-brand-border/50 bg-gradient-to-b from-brand-card/30 to-brand-bg space-y-5 text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-brand-border/30 pb-3">
                <span className="text-[10px] bg-brand-danger/10 text-brand-danger font-black px-2 py-0.5 rounded tracking-wider uppercase">AI Weak-Key Report</span>
                <Brain className="w-4 h-4 text-brand-danger" />
              </div>

              <div className="space-y-4 pt-4">
                <div className="bg-brand-danger/5 border border-brand-danger/20 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-brand-muted uppercase font-extrabold">Target Recovery Key</span>
                    <span className="text-xl font-black text-white block">Key "R"</span>
                  </div>
                  <div className="bg-brand-danger/10 text-brand-danger px-2.5 py-1 rounded-xl text-lg font-black font-mono">
                    92% Recovery
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div className="border border-brand-border/30 p-2 rounded-xl">
                    <span className="text-brand-muted block">Confusion Key</span>
                    <strong className="text-white font-mono block">E (42% rate)</strong>
                  </div>
                  <div className="border border-brand-border/30 p-2 rounded-xl">
                    <span className="text-brand-muted block">Speed Impact</span>
                    <strong className="text-brand-danger font-mono block">-5.4 WPM</strong>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-brand-muted mt-4">
              AI reports predict words-per-minute gains once weak keystrokes reach 95%+ recovery targets.
            </p>
          </div>

          {/* Card C: Academy Progress Card */}
          <div className="glass-panel p-6 rounded-3xl border border-brand-border/50 bg-gradient-to-b from-brand-card/30 to-brand-bg space-y-5 text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-brand-border/30 pb-3">
                <span className="text-[10px] bg-brand-success/10 text-brand-success font-black px-2 py-0.5 rounded tracking-wider uppercase">Academy Progress</span>
                <Award className="w-4 h-4 text-brand-success" />
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-success/10 text-brand-success p-2 rounded-lg font-black text-xs font-mono">
                    Node 4
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <span className="text-xs font-bold text-white block truncate">Home Row Layout Mastery</span>
                    <span className="text-[9px] text-brand-muted block">Syllables focusing on A, S, D, F, J, K, L</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-brand-muted">Node Completion</span>
                    <strong className="text-white">75% (3/4 drills done)</strong>
                  </div>
                  <div className="w-full bg-brand-card rounded-full h-2 overflow-hidden border border-brand-border/40">
                    <div className="bg-brand-success h-full w-[75%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-brand-muted mt-4">
              Structured pathways lead you node-by-node from key positioning basics to production-level coding templates.
            </p>
          </div>
          
        </div>
      </section>

      {/* ── 5. Footer ── */}
      <footer className="border-t border-brand-border/40 pt-10 px-4 text-center max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-primary" />
            <span className="font-bold text-white text-sm">TypeMentor AI Beta</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-brand-muted font-medium">
            <span>Built by Shivam Dwivedi</span>
            <span className="text-brand-border">|</span>
            <button
              onClick={() => onNavigateToPage?.('privacy')}
              className="hover:text-white hover:underline transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-brand-border">•</span>
            <button
              onClick={() => onNavigateToPage?.('terms')}
              className="hover:text-white hover:underline transition-colors"
            >
              Terms of Service
            </button>
            <span className="text-brand-border">|</span>
            <a
              href="#feedback"
              onClick={(e) => {
                e.preventDefault();
                const btn = document.querySelector('button[class*="fixed bottom-6 left-6"]');
                if (btn) (btn as HTMLButtonElement).click();
              }}
              className="text-brand-primary hover:underline"
            >
              Contact / Submit Feedback
            </a>
          </div>
        </div>

        <p className="text-[10px] text-brand-muted">
          © 2026 TypeMentor AI. Prepared for public beta pre-launch release testing.
        </p>
      </footer>
    </div>
  );
}
