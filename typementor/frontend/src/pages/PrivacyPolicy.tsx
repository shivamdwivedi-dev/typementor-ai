import { Shield, ArrowLeft, Lock, MessageSquare, Database } from 'lucide-react';
import SEOMeta from '../components/SEOMeta';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-brand-text select-text">
      <SEOMeta
        title="Privacy Policy — TypeMentor AI"
        description="TypeMentor AI privacy policy. Learn how we handle typing analytics, Google authentication, local browser storage, and beta feedback. Your data is never sold or shared."
        canonical="https://typementor-ai-frontend.vercel.app/privacy"
      />
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-brand-muted hover:text-white transition-colors border border-brand-border px-3.5 py-2 rounded-xl bg-brand-card/25 mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to App
      </button>

      <div className="glass-panel p-8 md:p-12 rounded-3xl border border-brand-border/50 bg-gradient-to-b from-brand-card/30 to-brand-bg space-y-8">
        <div className="flex items-center gap-3 border-b border-brand-border/30 pb-5">
          <div className="bg-brand-primary/10 p-3 rounded-2xl text-brand-primary">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-brand-muted uppercase tracking-wider font-semibold mt-1">TypeMentor AI Beta</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-primary" /> Beta Software Notice
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            TypeMentor AI is currently in public beta testing. It is provided "as is" to gather performance metrics and user feedback. While we strive to protect your data, we cannot guarantee absolute legal or regulatory compliance (such as formal HIPAA or custom compliance audits) at this stage. Use the application at your own discretion.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-brand-success" /> Typing Analytics & Metrics
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            To provide adaptive AI coaching, we collect typing metrics including Words Per Minute (WPM), accuracy percentages, keystroke hold times, reaction times, and key-specific error rates. For registered users, these metrics are stored in our secure database to generate personalized reports and unlock achievements. For guest users, progress and metrics are stored entirely in your local browser (<code className="bg-brand-card px-1 rounded text-white text-xs">localStorage</code>).
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-warning" /> Google Authentication
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            If you choose to sign in using Google, we retrieve your basic profile information (name, email, and avatar picture). This data is strictly used for account authentication, user identification, and displaying your profile within the app. We do not sell, share, or use your profile details for advertising or external tracking.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-primary" /> Third-Party Advertising & Cookies (Google AdSense)
          </h2>
          <div className="text-sm text-brand-muted leading-relaxed space-y-3">
            <p>
              When advertising is enabled, TypeMentor AI partners with third-party vendors, including Google, to serve advertisements when you visit our website.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Third-Party Cookies:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites across the internet.
              </li>
              <li>
                <strong className="text-white">Advertising Cookies:</strong> Google's use of advertising cookies enables it and its partners to serve ads to users based on their visits to TypeMentor AI and/or other sites on the internet.
              </li>
              <li>
                <strong className="text-white">Personalized Ad Opt-Out:</strong> Users may opt out of personalized advertising by visiting{' '}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary underline hover:text-white"
                >
                  Google Ads Settings
                </a>
                . Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting{' '}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary underline hover:text-white"
                >
                  www.aboutads.info
                </a>{' '}
                or the{' '}
                <a
                  href="https://optout.networkadvertising.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary underline hover:text-white"
                >
                  Network Advertising Initiative Opt-Out Page
                </a>
                .
              </li>
              <li>
                <strong className="text-white">Zero Typing Data Targeting:</strong> We do NOT sell, license, or provide your keystroke metrics, typing speed, mistake patterns, or code snippets to advertisers or third-party data brokers.
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" /> User Rights (GDPR, UK GDPR & CCPA/CPRA)
          </h2>
          <div className="text-sm text-brand-muted leading-relaxed space-y-2">
            <p>
              Depending on your jurisdiction, you possess specific privacy rights under applicable data protection laws:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-white">Right of Access & Portability:</strong> You can view and export your typing history and profile at any time.</li>
              <li><strong className="text-white">Right to Erasure (Deletion):</strong> You may request the complete deletion of your account and associated typing records.</li>
              <li><strong className="text-white">Right to Opt Out of Sale/Sharing:</strong> TypeMentor AI does not sell or share personal information for monetary compensation.</li>
              <li><strong className="text-white">Cookie Control:</strong> You can manage or withdraw consent for non-essential cookies at any time via your browser settings or our on-site cookie choices.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-danger" /> Interactive 3D Finger Guide & Device Privacy
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            TypeMentor AI provides an interactive 3D finger-positioning and virtual keyboard guide rendered locally in your browser using WebGL. TypeMentor AI does not request, access, capture, or transmit any camera, webcam, or microphone feeds from your device.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Beta Feedback System
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            Any feedback submitted via the "Send Feedback" widget is recorded in your browser's local storage and can be exported as CSV/JSON. This allows you to inspect exactly what is tracked and share it with us manually.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" /> Contact & Data Protection Inquiries
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            If you have questions about this Privacy Policy, your personal data, or wish to exercise your data protection rights, please contact the developer directly at{' '}
            <a href="mailto:shivamdwivedi.dev@gmail.com" className="text-brand-primary font-semibold underline hover:text-white">
              shivamdwivedi.dev@gmail.com
            </a>
            .
          </p>
        </section>

        <div className="border-t border-brand-border/30 pt-6 flex justify-between items-center text-[11px] text-brand-muted">
          <span>Last updated: October 2026</span>
          <span> शिवम द्विवेदी (Shivam Dwivedi)</span>
        </div>
      </div>
    </div>
  );
}
