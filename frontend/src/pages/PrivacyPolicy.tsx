import { Shield, ArrowLeft, Lock, Camera, MessageSquare, Database } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-brand-text select-text">
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
            <Camera className="w-4 h-4 text-brand-danger" /> Camera / Finger Mode Privacy
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            The optional Hand / Finger tracking camera mode is completely sandboxed in your browser. All computer vision processing is performed locally on your device via TensorFlow.js. The video stream is processed in real time and discarded instantly. **No video feed or image frames are ever captured, saved, or sent over the network.**
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

        <div className="border-t border-brand-border/30 pt-6 flex justify-between items-center text-[11px] text-brand-muted">
          <span>Last updated: June 2026</span>
          <span> शिवम द्विवेदी (Shivam Dwivedi)</span>
        </div>
      </div>
    </div>
  );
}
