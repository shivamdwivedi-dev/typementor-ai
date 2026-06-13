import { FileText, ArrowLeft, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
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
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
            <p className="text-xs text-brand-muted uppercase tracking-wider font-semibold mt-1">TypeMentor AI Beta</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-brand-warning" /> 1. Acceptance of Terms
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            By using TypeMentor AI (including Guest Mode or Registered account options), you acknowledge that this is a beta release of an educational tool. The service is provided "as is" without warranties or performance guarantees of any kind.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-brand-success" /> 2. Guest Mode & Storage
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            Guest mode data is saved solely in your local browser workspace. Cleansing browser site data, clearing cookies, or changing computers will result in complete data loss. TypeMentor AI does not back up or archive guest progress. Registered users sync data directly to our database, but backups are still subject to beta maintenance limits.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-primary" /> 3. Fair Use & AI Coaching
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            The AI Coach is powered by client heuristics and LLM inference. Suggestions are personalized based on your speed, accuracy, and keystroke logs. These suggestions are educational guidelines and should not be construed as professional vocational or ergonomic medical advice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-danger" /> 4. Service Changes & Termination
          </h2>
          <p className="text-sm text-brand-muted leading-relaxed">
            As this is beta software, we reserve the right to temporarily modify, reset, or suspend service, accounts, database records, and features at any time without notice.
          </p>
        </section>

        <div className="border-t border-brand-border/30 pt-6 flex justify-between items-center text-[11px] text-brand-muted">
          <span>Last updated: June 2026</span>
          <span>© 2026 TypeMentor AI</span>
        </div>
      </div>
    </div>
  );
}
