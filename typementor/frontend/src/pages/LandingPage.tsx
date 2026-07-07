import { Brain, Award, Activity, Flame, ShieldCheck, BookOpen, ChevronRight, Zap, BarChart2, CheckCircle } from 'lucide-react';
import SEOMeta from '../components/SEOMeta';

interface LandingPageProps {
  onGetStarted: () => void;
  onTryAcademy: () => void;
  onNavigateToPage?: (page: 'privacy' | 'terms') => void;
}

const LANDING_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'EducationalApplication',
      'name': 'TypeMentor AI',
      'url': 'https://typementor-ai-frontend.vercel.app/',
      'description': 'AI-powered adaptive typing coach. Identify weak keys, practice coding syntax, and improve your WPM with personalized structured lessons.',
      'applicationCategory': 'EducationalApplication',
      'isAccessibleForFree': true,
      'inLanguage': 'en',
      'featureList': [
        'AI weak-key detection',
        'Live WPM and accuracy tracking',
        'Typing Academy with structured lessons',
        'Coding syntax practice',
        'XP system and achievements'
      ],
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'creator': { '@type': 'Person', 'name': 'Shivam Dwivedi' }
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'Is TypeMentor AI completely free?',
          'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes. TypeMentor AI is free for all users. Create an account to sync progress or use Guest Mode without registering.' }
        },
        {
          '@type': 'Question',
          'name': 'How does the AI detect weak typing keys?',
          'acceptedAnswer': { '@type': 'Answer', 'text': 'Every keystroke is recorded with timing data. TypeMentor computes per-key error rates, confusion patterns, and reaction time, flagging keys above 15% error rate for targeted drills.' }
        },
        {
          '@type': 'Question',
          'name': 'What programming languages does TypeMentor support for coding practice?',
          'acceptedAnswer': { '@type': 'Answer', 'text': 'TypeMentor includes syntax-accurate practice templates for Python, JavaScript, Java, and SQL.' }
        },
        {
          '@type': 'Question',
          'name': 'How long does it take to improve typing speed?',
          'acceptedAnswer': { '@type': 'Answer', 'text': 'Most users see measurable improvement in 2 to 4 weeks of daily 15-minute targeted practice sessions.' }
        }
      ]
    }
  ]
};

export default function LandingPage({ onGetStarted, onTryAcademy, onNavigateToPage }: LandingPageProps) {
  return (
    <div className="w-full space-y-24 py-10 pb-20">
      <SEOMeta
        title="TypeMentor AI — Free AI Typing Coach for Developers & Students"
        description="TypeMentor AI is a free AI-powered typing coach. Identify weak keys, practice coding syntax, improve your WPM & accuracy with structured lessons and live keystroke diagnostics."
        canonical="https://typementor-ai-frontend.vercel.app/"
        jsonLd={LANDING_JSON_LD}
      />
      
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

      {/* ── 5. How TypeMentor Works ── */}
      <section className="space-y-10 px-4 max-w-5xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">How TypeMentor AI Works</h2>
          <p className="text-brand-muted text-sm max-w-2xl mx-auto leading-relaxed">
            A three-step adaptive cycle that gets smarter with every session you complete.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Practice & Measure',
              body: 'Type through structured lessons or free-form sessions. TypeMentor records every keystroke, reaction time, hold time, and pause — building a precise map of your current skill level.',
              color: 'text-brand-primary'
            },
            {
              step: '02',
              title: 'AI Diagnostic Analysis',
              body: 'Our AI identifies your weakest keys, confusion patterns (such as mixing "E" with "R"), and the exact characters costing you the most speed. No guesswork — pure data.',
              color: 'text-brand-warning'
            },
            {
              step: '03',
              title: 'Targeted Recovery Drills',
              body: 'Generate custom syllable-building lessons designed around your specific weak keys. Repeat until accuracy exceeds 95%, then advance to the next challenge node.',
              color: 'text-brand-success'
            }
          ].map(item => (
            <article key={item.step} className="glass-panel p-6 rounded-2xl border border-brand-border/40 text-left space-y-3">
              <span className={`text-4xl font-black font-mono ${item.color} opacity-40`}>{item.step}</span>
              <h3 className="font-bold text-white text-base">{item.title}</h3>
              <p className="text-brand-muted text-xs leading-relaxed">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── 6. Benefits of Touch Typing ── */}
      <section className="space-y-10 px-4 py-10 bg-brand-card/10 border-y border-brand-border/30">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Why Learn Touch Typing?</h2>
          <p className="text-brand-muted text-sm leading-relaxed">
            Touch typing — typing without looking at the keyboard — is one of the highest-leverage productivity skills a developer or knowledge worker can build.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {[
            { title: 'Save 20+ Hours Per Month', body: 'The average developer types 40 WPM. At 80 WPM, the same work takes half the time. That compounds to hundreds of hours saved annually.' },
            { title: 'Reduce Cognitive Load', body: 'When typing is automatic, your full mental bandwidth stays on problem-solving. Errors and hesitation break your flow and interrupt deep work.' },
            { title: 'Fewer Repetitive Strain Injuries', body: 'Correct finger placement distributes load evenly across both hands, reducing the risk of RSI, carpal tunnel, and wrist fatigue over time.' },
            { title: 'Better Code Quality', body: 'Faster, more accurate typing means you can keep up with your own thought process. Slower typists often simplify ideas to reduce typing burden.' },
            { title: 'Interview Confidence', body: 'Live coding interviews are stressful enough. Being able to type quickly and accurately without looking down removes one major source of anxiety.' },
            { title: 'Long-Term Career Asset', body: 'Unlike most technical skills, typing speed does not become obsolete. It remains valuable through every programming language, editor, and tool change.' }
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-4 bg-brand-card/20 border border-brand-border/25 rounded-2xl">
              <CheckCircle className="w-5 h-5 text-brand-success flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                <p className="text-brand-muted text-xs leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. FAQ ── */}
      <section className="space-y-8 px-4 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'Is TypeMentor AI completely free?',
              a: 'Yes. TypeMentor AI is free to use for all users. Create an account to sync your progress and unlock achievements, or use Guest Mode without registering.'
            },
            {
              q: 'Do I need to create an account?',
              a: 'No. Guest Mode lets you practice immediately — your progress is stored locally in your browser. Creating a free account enables cross-device sync, achievement tracking, and personalized AI diagnostics.'
            },
            {
              q: 'How does the AI detect my weak keys?',
              a: 'Every keystroke you type is recorded with timing data. TypeMentor\'s AI computes per-key error rates, confusion patterns (which key you pressed instead), and reaction time. Keys above a 15% error threshold are flagged for targeted recovery drills.'
            },
            {
              q: 'What programming languages does it support for coding practice?',
              a: 'TypeMentor includes syntax-accurate practice templates for Python, JavaScript, Java, and SQL — covering real-world patterns like function definitions, loops, conditionals, and database queries.'
            },
            {
              q: 'How long does it take to improve typing speed?',
              a: 'Most users see measurable improvement in 2–4 weeks of daily 15-minute sessions. The key is consistent practice targeting your specific weak areas, which TypeMentor automates for you.'
            },
            {
              q: 'Is my camera data private?',
              a: 'Completely. The optional posture camera mode runs entirely in your browser using TensorFlow.js. No video frames are ever uploaded, stored, or sent to our servers.'
            }
          ].map((item, i) => (
            <details key={i} className="glass-panel border border-brand-border/40 rounded-2xl group">
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none gap-3">
                <h3 className="font-semibold text-white text-sm text-left">{item.q}</h3>
                <span className="text-brand-muted text-lg flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
              </summary>
              <p className="text-brand-muted text-xs leading-relaxed px-5 pb-5">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── 8. Footer ── */}
      <footer className="border-t border-brand-border/40 pt-10 px-4 text-center max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-brand-primary" />
            <span className="font-bold text-white text-sm">TypeMentor AI Beta</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-brand-muted font-medium">
            <span>Built by Shivam Dwivedi</span>
            <span className="text-brand-border">|</span>
            <a
              href="/privacy"
              onClick={(e) => { e.preventDefault(); onNavigateToPage?.('privacy'); }}
              className="hover:text-white hover:underline transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-brand-border">•</span>
            <a
              href="/terms"
              onClick={(e) => { e.preventDefault(); onNavigateToPage?.('terms'); }}
              className="hover:text-white hover:underline transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-brand-border">|</span>
            <a
              href="/academy"
              className="text-brand-primary hover:underline"
            >
              Try Typing Academy
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
