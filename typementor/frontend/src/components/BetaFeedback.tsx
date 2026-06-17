import { useState, useEffect } from 'react';
import { useTypingStore } from '../store/TypingStore';
import { useAuthStore } from '../store/AuthStore';
import { MessageSquare, X, Download, Sparkles, CheckCircle2 } from 'lucide-react';

export default function BetaFeedback() {
  const isTypingActive = useTypingStore((state) => state.isActive);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { user, token } = useAuthStore();

  const isDevAdmin = user && (
    user.email.toLowerCase() === 'shivamdwivedi.dev@gmail.com' ||
    (import.meta.env.VITE_ADMIN_EMAIL && user.email.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL.toLowerCase())
  );

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [device, setDevice] = useState('');
  const [rating, setRating] = useState(10);
  const [whatWorked, setWhatWorked] = useState('');
  const [whatConfused, setWhatConfused] = useState('');
  const [bugFound, setBugFound] = useState('');
  const [suggestion, setSuggestion] = useState('');

  // Auto detect device type
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      setDevice('Tablet');
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
      setDevice('Mobile');
    } else {
      setDevice('Desktop');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bodyData = {
      name,
      email: email || null,
      device,
      rating,
      whatWorked,
      whatConfused,
      bugFound,
      suggestion
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit feedback to server.');
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setIsOpen(false);
        // Reset form
        setName('');
        setEmail('');
        setRating(10);
        setWhatWorked('');
        setWhatConfused('');
        setBugFound('');
        setSuggestion('');
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Error submitting feedback.');
    }
  };

  const exportJSON = async () => {
    try {
      if (!token) throw new Error('Authentication required.');
      
      const response = await fetch('/api/feedback', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch feedback.');
      }
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `typementor_feedback_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export feedback.');
    }
  };

  const exportCSV = async () => {
    try {
      if (!token) throw new Error('Authentication required.');
      
      const response = await fetch('/api/feedback', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to fetch feedback.');
      }
      
      const data = await response.json();
      if (data.length === 0) {
        alert('No feedback submitted yet to export.');
        return;
      }
      
      const headers = ['ID', 'Name', 'Email', 'Device', 'Rating', 'What Worked Well', 'What Felt Confusing', 'Bug Found', 'Feature Suggestion', 'Created At'];
      const rows = data.map((item: any) => [
        item.id,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${(item.email || '').replace(/"/g, '""')}"`,
        item.device,
        item.rating,
        `"${(item.whatWorked || '').replace(/"/g, '""')}"`,
        `"${(item.whatConfused || '').replace(/"/g, '""')}"`,
        `"${(item.bugFound || '').replace(/"/g, '""')}"`,
        `"${(item.suggestion || '').replace(/"/g, '""')}"`,
        item.createdAt
      ]);

      const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `typementor_feedback_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export feedback.');
    }
  };

  // Hide or minimize if typing is active
  if (isTypingActive) {
    return null; // completely hide it to not distract user during typing
  }

  return (
    <>
      {/* Floating Send Feedback Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-45 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all text-xs flex items-center gap-2 border border-indigo-400/30"
      >
        <MessageSquare className="w-4 h-4 animate-pulse" />
        <span>Beta Feedback</span>
      </button>

      {/* Feedback Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-brand-bg/95 border border-brand-border/80 glass-panel rounded-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-brand-card/80 text-brand-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-brand-success/10 p-4 rounded-full text-brand-success border border-brand-success/25 animate-bounce">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-white">Thank You for Your Feedback!</h3>
                <p className="text-xs text-brand-muted max-w-xs">
                  Your response has been saved. We will use this to improve TypeMentor AI before launch.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-primary/10 p-2.5 rounded-xl text-brand-primary border border-brand-primary/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Send Beta Feedback</h3>
                    <p className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">Help us refine TypeMentor AI</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Shivam Dwivedi"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-2 px-3 text-xs text-white placeholder-brand-muted transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">Email Address <span className="text-[9px] lowercase font-normal text-brand-muted">(optional)</span></label>
                      <input
                        type="email"
                        placeholder="shivam@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-2 px-3 text-xs text-white placeholder-brand-muted transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">Device/OS</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Windows Chrome, Mac Safari"
                        value={device}
                        onChange={(e) => setDevice(e.target.value)}
                        className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-2 px-3 text-xs text-white placeholder-brand-muted transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">Rating: {rating}/10</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={rating}
                          onChange={(e) => setRating(Number(e.target.value))}
                          className="w-full accent-brand-primary"
                        />
                        <span className="text-xs font-black text-brand-primary font-mono">{rating}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">What worked well?</label>
                    <textarea
                      rows={2}
                      placeholder="What did you like about the typing practice or analytics?"
                      value={whatWorked}
                      onChange={(e) => setWhatWorked(e.target.value)}
                      className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-2 px-3 text-xs text-white placeholder-brand-muted transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">What felt confusing?</label>
                    <textarea
                      rows={2}
                      placeholder="Any part of the coach, telemetry reports, or UI that was unclear?"
                      value={whatConfused}
                      onChange={(e) => setWhatConfused(e.target.value)}
                      className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-2 px-3 text-xs text-white placeholder-brand-muted transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">Bug Found?</label>
                      <input
                        type="text"
                        placeholder="Explain steps to reproduce if you saw an error"
                        value={bugFound}
                        onChange={(e) => setBugFound(e.target.value)}
                        className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-2 px-3 text-xs text-white placeholder-brand-muted transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-brand-muted tracking-wider mb-1">Feature Suggestions?</label>
                      <input
                        type="text"
                        placeholder="What else would make this typing coach amazing?"
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        className="w-full bg-brand-bg/50 border border-brand-border hover:border-brand-primary/40 focus:border-brand-primary focus:outline-none rounded-xl py-2 px-3 text-xs text-white placeholder-brand-muted transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4">
                    {/* Developer Admin Tools */}
                    {isDevAdmin && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={exportJSON}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-brand-card hover:bg-brand-card/80 border border-brand-border text-brand-muted hover:text-white flex items-center gap-1 transition-all"
                          title="Developer: Export feedback to JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                          JSON
                        </button>
                        <button
                          type="button"
                          onClick={exportCSV}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-brand-card hover:bg-brand-card/80 border border-brand-border text-brand-muted hover:text-white flex items-center gap-1 transition-all"
                          title="Developer: Export feedback to CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          CSV
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all text-xs border border-indigo-400/35"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
