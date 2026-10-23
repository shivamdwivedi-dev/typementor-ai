import React, { useState } from 'react';
import { 
  Mail, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Github, 
  Clock, 
  HelpCircle, 
  Sparkles, 
  AlertCircle,
  Zap,
  Globe2
} from 'lucide-react';
import SEOMeta from '../components/SEOMeta';
import TubesBackground from '../components/ui/neon-flow';

interface ContactUsProps {
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

export default function ContactUs({ onBack }: ContactUsProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inquiryType, setInquiryType] = useState('General Support');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Please write a message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          device: typeof navigator !== 'undefined' ? `${navigator.userAgent}` : 'Web Client',
          rating: 10,
          whatWorked: `[${inquiryType}] Inquired via Contact Us Page`,
          whatConfused: '',
          bugFound: inquiryType === 'Bug Report' ? message.trim() : '',
          suggestion: inquiryType !== 'Bug Report' ? message.trim() : '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit message.');
      }

      setIsSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg('Failed to send your message. You can also email us directly at shivamdwivedi.dev@gmail.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-brand-text select-text space-y-8">
      <SEOMeta
        title="Contact Us — TypeMentor AI"
        description="Contact the TypeMentor AI development team. Reach out for support, bug reports, feature requests, academic access, or publisher inquiries."
        canonical="https://typementor-ai-frontend.vercel.app/contact"
      />

      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-white transition-colors border border-brand-border px-3.5 py-2 rounded-xl bg-brand-card/25"
      >
        <ArrowLeft className="w-4 h-4" /> Back to App
      </button>

      {/* ── 1. Hero Section with Interactive Tubes Neon Background (Same as Homepage & About) ── */}
      <section className="relative text-center rounded-[32px] overflow-hidden border border-brand-border/40 shadow-2xl">
        <TubesBackground className="py-14 md:py-20 px-6">
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/40 px-3.5 py-1.5 rounded-full text-brand-primary text-xs font-black tracking-widest uppercase animate-pulse pointer-events-auto">
              <Zap className="w-3.5 h-3.5 fill-brand-primary" />
              <span>Contact & Support</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-[0_0_25px_rgba(0,0,0,0.9)] select-none">
              Have Questions or Feedback? <br />
              <span className="bg-gradient-to-r from-brand-primary via-indigo-400 to-brand-success bg-clip-text text-transparent">
                We're Here to Help.
              </span>
            </h1>

            <p className="text-sm md:text-base text-slate-200 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-md">
              Whether you discovered a bug, want to suggest new programming syntax lessons, or need academic support for your classroom, our team responds to every inquiry.
            </p>
          </div>
        </TubesBackground>
      </section>

      {/* ── 2. Contact Form & Direct Channels Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Card (7 Columns) */}
        <div className="lg:col-span-7">
          <NeonCard
            title="Send Us a Direct Message"
            subtitle="Get In Touch"
            icon={<MessageSquare className="w-5 h-5" />}
            accentColor="bg-brand-primary"
          >
            {isSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Thank You! Message Received</h4>
                <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Your message has been received by our engineering team. If a reply is needed, we will reach out to you within 24 to 48 hours.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs font-bold text-brand-primary hover:underline pt-2 inline-block"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-200">
                      Your Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Chen"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-200">
                      Email Address <span className="text-zinc-500 font-normal">(optional, for replies)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-200">Inquiry Subject</label>
                  <select
                    value={inquiryType}
                    onChange={(e) => setInquiryType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
                  >
                    <option value="General Support">General Support & Inquiry</option>
                    <option value="Bug Report">Bug Report / Technical Issue</option>
                    <option value="Feature Request">Feature Request / New Syntax Suggestion</option>
                    <option value="Arena Matchmaking">Arena Matchmaking or Anti-Cheat Report</option>
                    <option value="Educational / Classroom">Classroom & University Access</option>
                    <option value="Partnership / AdSense">Publisher, Partnership & Sponsorship</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-200">
                    Message <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your inquiry, bug details, or feature feedback in detail..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all border border-indigo-400/40 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending Message...' : 'Submit Message'}</span>
                </button>
              </form>
            )}
          </NeonCard>
        </div>

        {/* Channels & Info (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          <NeonCard
            title="Official Contact Channels"
            subtitle="Direct Reach"
            icon={<Mail className="w-5 h-5" />}
            accentColor="bg-blue-600"
            ringColor="bg-blue-500/10 group-hover:bg-blue-500/20"
          >
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Primary Email</p>
                <a
                  href="mailto:shivamdwivedi.dev@gmail.com"
                  className="text-xs font-bold text-brand-primary hover:underline mt-0.5 inline-block"
                >
                  shivamdwivedi.dev@gmail.com
                </a>
              </div>

              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Issue Tracker</p>
                <a
                  href="https://github.com/shivamdwivedi-dev/typementor-ai/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 mt-0.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  GitHub Issues & Feature Requests
                </a>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Response SLA: Within 24–48 hours (Mon–Fri).</span>
              </div>
            </div>
          </NeonCard>

          <NeonCard
            title="Creator & Publisher"
            subtitle="Identity Verification"
            icon={<Globe2 className="w-5 h-5" />}
            accentColor="bg-indigo-600"
            ringColor="bg-indigo-500/10 group-hover:bg-indigo-500/20"
          >
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-white">Shivam Dwivedi</p>
              <p className="text-zinc-400 leading-relaxed">
                Lead Engineer & Publisher of TypeMentor AI. Located in India, serving software engineers and students globally.
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified Publisher Identity
                </span>
              </div>
            </div>
          </NeonCard>
        </div>
      </div>

      {/* ── 3. Quick FAQ in 3D Neon Card ── */}
      <NeonCard
        title="Frequently Answered Inquiries"
        subtitle="Self-Serve Answers"
        icon={<HelpCircle className="w-5 h-5" />}
        accentColor="bg-purple-600"
        ringColor="bg-purple-500/10 group-hover:bg-purple-500/20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" /> How do I request new language syntax?
            </h4>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Submit your request using the form above or open an issue on our GitHub repo. We prioritize languages based on community demand (e.g. Rust, Go, C++, TypeScript).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" /> Can our school or bootcamp use TypeMentor?
            </h4>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Yes! TypeMentor AI is 100% free and open for educational institutions, classrooms, and programming bootcamps. No student licensing fees required.
            </p>
          </div>
        </div>
      </NeonCard>

      {/* Footer info */}
      <div className="pt-4 border-t border-brand-border/30 flex flex-wrap items-center justify-between gap-4 text-xs text-brand-muted">
        <p>© 2026 TypeMentor AI. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <a href="/about" onClick={(e) => { e.preventDefault(); onBack(); }} className="hover:text-white underline">
            About Us
          </a>
          <span>•</span>
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
