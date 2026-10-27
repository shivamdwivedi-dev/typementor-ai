import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  Code2, 
  HeartPulse, 
  Cpu, 
  Zap, 
  Share2, 
  Bookmark, 
  ChevronRight, 
  Lightbulb, 
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import SEOMeta from '../components/SEOMeta';
import TubesBackground from '../components/ui/neon-flow';
import AdSenseSlot from '../components/AdSenseSlot';
import { 
  GUIDES_ARTICLES, 
  GUIDES_CATEGORIES 
} from '../data/guidesData';

interface NeonCardProps {
  icon?: React.ReactNode;
  ringColor?: string;
  children: React.ReactNode;
  className?: string;
}

function NeonCard({
  icon,
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
              }}
            />
          ))}
        </div>

        {/* Content Container */}
        <div className="relative z-10 [transform-style:preserve-3d]">
          {icon && (
            <div className="mb-4 inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-3.5 shadow-inner backdrop-blur-md transition-transform duration-500 group-hover:[transform:translate3d(0,0,30px)]">
              {icon}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export default function GuidesHub() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isBlogRoute = location.pathname.startsWith('/blog');
  const basePath = isBlogRoute ? '/blog' : '/guides';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Articles');
  const [copiedLink, setCopiedLink] = useState(false);

  // Scroll to top on article change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // Find active article if slug is in URL
  const activeArticle = useMemo(() => {
    if (!slug) return null;
    return GUIDES_ARTICLES.find((a) => a.slug === slug) || null;
  }, [slug]);

  // Filtered articles for the index view
  const filteredArticles = useMemo(() => {
    return GUIDES_ARTICLES.filter((article) => {
      const matchesCategory =
        selectedCategory === 'All Articles' || article.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.subtitle.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.keyTakeaways.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Touch Typing Mastery':
      case 'Typing Fundamentals':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Speed & Accuracy':
        return <Sparkles className="w-4 h-4 text-blue-400" />;
      case 'Practice & Routines':
        return <Clock className="w-4 h-4 text-purple-400" />;
      case 'Developer Syntax & Coding':
      case 'Students & Careers':
        return <Code2 className="w-4 h-4 text-indigo-400" />;
      case 'Ergonomics & Health':
      case 'Hardware & Ergonomics':
        return <HeartPulse className="w-4 h-4 text-emerald-400" />;
      case 'Keystroke Biometrics & AI':
        return <Cpu className="w-4 h-4 text-cyan-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
    }
  };

  // Structured Schema for Single Article
  const articleJsonLd = useMemo(() => {
    if (!activeArticle) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `https://www.typementor.in/guides/${activeArticle.slug}`,
      },
      'headline': activeArticle.title,
      'description': activeArticle.summary,
      'image': 'https://www.typementor.in/og-image.png',
      'author': {
        '@type': /team|board|group|lab|analytics/i.test(activeArticle.author) ? 'Organization' : 'Person',
        'name': activeArticle.author,
        ...(activeArticle.authorRole ? { 'jobTitle': activeArticle.authorRole } : {}),
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'TypeMentor AI',
        'url': 'https://www.typementor.in',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://www.typementor.in/apple-touch-icon.png',
        },
      },
      'datePublished': '2026-10-27',
      'dateModified': '2026-10-27',
      'articleSection': activeArticle.category,
      'keywords': activeArticle.keyTakeaways.join(', '),
    };
  }, [activeArticle]);

  // Structured Schema for Hub Index
  const hubJsonLd = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'TypeMentor AI Typing Guides & Knowledge Hub',
      'description': 'Comprehensive educational guides and research on touch typing, keyboard ergonomics, typing tests, programmer syntax, and speed training.',
      'url': 'https://www.typementor.in/guides',
      'publisher': {
        '@type': 'Organization',
        'name': 'TypeMentor AI',
        'url': 'https://www.typementor.in',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://www.typementor.in/apple-touch-icon.png',
        },
      },
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // SLUG PROVIDED BUT NOT FOUND (404 Not Found fallback)
  // ─────────────────────────────────────────────────────────────────────────────
  if (slug && !activeArticle) {
    return (
      <div className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
        <SEOMeta
          title="Guide Not Found — TypeMentor AI"
          description="The requested typing guide could not be located in our educational knowledge library."
          canonical="/guides"
          noIndex={true}
        />
        <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Guide Not Found</h1>
        <p className="text-sm text-zinc-400 max-w-md mb-6">
          We could not find an article with the slug <code className="text-amber-300 bg-zinc-900 px-2 py-0.5 rounded">"{slug}"</code>. It may have been renamed or moved.
        </p>
        <button
          onClick={() => navigate(basePath)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Return to All Guides
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 1: DEEP ARTICLE VIEW (/guides/:slug or /blog/:slug)
  // ─────────────────────────────────────────────────────────────────────────────
  if (activeArticle) {
    const relatedArticles = GUIDES_ARTICLES.filter((a) =>
      activeArticle.relatedSlugs.includes(a.slug)
    );

    return (
      <div className="relative min-h-screen text-slate-100 pb-20">
        <SEOMeta
          title={`${activeArticle.title} — TypeMentor AI Guides`}
          description={activeArticle.summary}
          canonical={`/guides/${activeArticle.slug}`}
          ogType="article"
          jsonLd={articleJsonLd}
        />

        {/* Top Breadcrumb & Back Bar */}
        <div className="max-w-5xl mx-auto pt-4 pb-6 px-4 flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/30">
          <div className="flex items-center gap-2 text-xs text-brand-muted">
            <Link to="/practice" className="hover:text-white transition-colors">
              App
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={basePath} className="hover:text-white transition-colors">
              {isBlogRoute ? 'Blog' : 'Knowledge Hub'}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-brand-primary font-medium truncate max-w-xs sm:max-w-md">
              {activeArticle.title}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 text-xs text-zinc-300 hover:text-white transition-all shadow-sm"
              title="Copy guide link to clipboard"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
            <button
              onClick={() => navigate(basePath)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-card hover:bg-brand-border/40 border border-brand-border text-xs font-bold text-white transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {isBlogRoute ? 'All Posts' : 'All Guides'}
            </button>
          </div>
        </div>

        {/* Article Container */}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
          {/* Article Header */}
          <header className="space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/15 text-brand-primary border border-brand-primary/30">
                {getCategoryIcon(activeArticle.category)}
                {activeArticle.category}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                <Clock className="w-3 h-3 text-zinc-400" />
                {activeArticle.readTime}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                Level: {activeArticle.difficulty}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {activeArticle.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
              {activeArticle.subtitle}
            </p>

            <div className="flex items-center gap-3 pt-3 border-t border-brand-border/20 text-xs text-brand-muted">
              <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center font-bold text-brand-primary">
                TM
              </div>
              <div>
                <p className="font-semibold text-white">{activeArticle.author}</p>
                <p className="text-[11px]">{activeArticle.authorRole} • Published {activeArticle.publishedDate}</p>
              </div>
            </div>
          </header>

          {/* Top AdSense Slot */}
          <AdSenseSlot slot={import.meta.env.VITE_ADSENSE_TOP_SLOT} className="w-full my-4" />

          {/* Key Takeaways Callout Card */}
          <NeonCard
            icon={<Sparkles className="w-6 h-6 text-brand-warning animate-pulse" />}
            ringColor="bg-brand-warning/10 group-hover:bg-brand-warning/20"
          >
            <div className="text-left space-y-3">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Executive Takeaways & Scientific Core
              </h2>
              <ul className="space-y-2 text-sm text-slate-300">
                {activeArticle.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          </NeonCard>

          {/* Table of Contents Navigation */}
          <nav className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 text-left space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5 text-brand-primary" /> Guide Sections & Quick Links
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {activeArticle.sections.map((sec, idx) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-slate-300 hover:text-white transition-colors truncate flex items-center gap-2"
                >
                  <span className="text-brand-primary font-bold">{idx + 1}.</span>
                  <span className="truncate">{sec.title.replace(/^\d+\.\s*/, '')}</span>
                </a>
              ))}
            </div>
          </nav>

          {/* Article Body Sections */}
          <article className="space-y-12 text-left">
            {activeArticle.sections.map((section, idx) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 space-y-4">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight border-b border-brand-border/20 pb-3">
                  {section.title}
                </h2>

                <div className="text-slate-300 leading-relaxed text-base space-y-4 whitespace-pre-line font-normal">
                  {section.content}
                </div>

                {section.codeSnippet && (
                  <div className="my-6 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-xl">
                    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-xs text-brand-muted">
                      <span className="font-mono">{section.codeSnippet.language.toUpperCase()}</span>
                      {section.codeSnippet.caption && (
                        <span className="italic">{section.codeSnippet.caption}</span>
                      )}
                    </div>
                    <pre className="p-4 overflow-x-auto font-mono text-xs text-emerald-400 bg-zinc-950/90 leading-relaxed">
                      <code>{section.codeSnippet.code}</code>
                    </pre>
                  </div>
                )}

                {section.proTip && (
                  <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-start gap-3 text-xs text-indigo-200">
                    <Lightbulb className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white uppercase tracking-wider block mb-0.5">
                        Pro Tip:
                      </span>
                      <span>{section.proTip}</span>
                    </div>
                  </div>
                )}

                {/* Mid-Article AdSense placement on long articles */}
                {idx === 1 && (
                  <AdSenseSlot slot={import.meta.env.VITE_ADSENSE_BOTTOM_SLOT} className="my-8 w-full" />
                )}
              </section>
            ))}
          </article>

          {/* CTA Box: Practice What You Read */}
          <div className="p-8 rounded-[28px] border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-zinc-900/70 to-slate-950 text-center space-y-4 shadow-2xl">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-2xl font-black text-white">
              Ready to Put These Principles Into Muscle Memory?
            </h3>
            <p className="text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
              TypeMentor AI features real-time flight-time tracking, deliberate bigram targeting, and live error recovery engines designed specifically around these techniques.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate('/practice')}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-95"
              >
                Launch Adaptive Practice <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/academy')}
                className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-all border border-zinc-700 flex items-center gap-2"
              >
                Typing Academy Lessons
              </button>
            </div>
          </div>

          {/* Related Guides Section */}
          {relatedArticles.length > 0 && (
            <div className="pt-8 border-t border-brand-border/30 text-left space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Continue the Deep Dive</h3>
                  <p className="text-xs text-brand-muted">Recommended educational guides following this article</p>
                </div>
                <button
                  onClick={() => navigate(basePath)}
                  className="text-xs text-brand-primary font-bold hover:underline flex items-center gap-1"
                >
                  View All Guides <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedArticles.map((rel) => (
                  <div
                    key={rel.slug}
                    onClick={() => navigate(`${basePath}/${rel.slug}`)}
                    className="p-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-brand-primary/50 cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between text-xs text-brand-muted">
                      <span className="flex items-center gap-1 text-brand-primary font-semibold">
                        {getCategoryIcon(rel.category)} {rel.category}
                      </span>
                      <span>{rel.readTime}</span>
                    </div>
                    <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                      {rel.title}
                    </h4>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {rel.summary}
                    </p>
                    <span className="text-xs font-bold text-brand-primary flex items-center gap-1 pt-1 group-hover:translate-x-1 transition-transform">
                      Read Deep Dive →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW 2: STARTING INDEX / HUB OVERVIEW (/guides or /blog)
  // ─────────────────────────────────────────────────────────────────────────────
  const featuredArticle = GUIDES_ARTICLES[0];

  return (
    <div className="relative min-h-screen text-slate-100 pb-20">
      <SEOMeta
        title={isBlogRoute ? "TypeMentor AI Blog — Typing Insights & Research" : "Typing Guides & Biomechanics Hub — TypeMentor AI"}
        description="Comprehensive guides to touch typing mastery, 100+ WPM speed strategies, typing test preparation, programmer syntax, ergonomics, and AI diagnostics."
        canonical="/guides"
        jsonLd={hubJsonLd}
      />

      {/* Floating Animated Background Tubes */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] z-0 overflow-hidden" aria-hidden="true">
        <TubesBackground enableClickInteraction={false} className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-brand-border/30 pb-4">
          <button
            onClick={() => navigate('/practice')}
            className="flex items-center gap-1.5 text-xs text-brand-primary font-bold hover:underline"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Practice Board
          </button>
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
            Educational Knowledge Repository
          </span>
        </div>

        {/* Hero Section */}
        <header className="text-center space-y-5 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold shadow-lg shadow-blue-500/10">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>TypeMentor AI Educational Content & Research Hub</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            The Science & Art of High-Velocity Typing
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Practical step-by-step guides, ergonomic protocols, 7-day and 30-day training routines, and developer syntax optimizations designed for learners, students, coders, and job seekers.
          </p>

          {/* Key Repository Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-left">
            {[
              { label: 'Resource Library', val: '25 Typing Guides' },
              { label: 'Original Content', val: '16,000+ Words' },
              { label: 'WPM Velocity', val: '100+ Mastery' },
              { label: 'Ergonomic Health', val: 'RSI Prevention' },
            ].map((stat, i) => (
              <div key={i} className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm font-extrabold text-white">{stat.val}</p>
              </div>
            ))}
          </div>
        </header>

        {/* Top AdSense Slot */}
        <AdSenseSlot slot={import.meta.env.VITE_ADSENSE_TOP_SLOT} className="w-full my-4" />

        {/* Featured Deep Dive */}
        {featuredArticle && (
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Featured Master Guide
              </span>
              <span className="text-xs text-brand-muted font-medium">{featuredArticle.readTime}</span>
            </div>

            <NeonCard
              icon={<Zap className="w-8 h-8 text-amber-400" />}
              ringColor="bg-amber-400/10 group-hover:bg-amber-400/20"
            >
              <div className="text-left space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    {featuredArticle.category}
                  </span>
                  <span className="text-xs text-brand-muted">Level: {featuredArticle.difficulty}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white hover:text-amber-300 transition-colors cursor-pointer"
                    onClick={() => navigate(`${basePath}/${featuredArticle.slug}`)}>
                  {featuredArticle.title}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  {featuredArticle.summary}
                </p>

                {/* Key Takeaways Preview */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Core Takeaways in this Guide:</p>
                  <ul className="text-xs text-slate-300 space-y-1.5">
                    {featuredArticle.keyTakeaways.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => navigate(`${basePath}/${featuredArticle.slug}`)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 active:scale-95"
                >
                  Read Full Master Guide <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </NeonCard>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="space-y-4 text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guides (e.g. Ergonomics, 100 WPM, Routine, Coding)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>

            <p className="text-xs text-brand-muted font-medium self-end sm:self-center">
              Showing <span className="text-white font-bold">{filteredArticles.length}</span> educational guides
            </p>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap gap-2">
            {GUIDES_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedCategory === cat
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {filteredArticles.map((article) => (
            <div
              key={article.slug}
              onClick={() => navigate(`${basePath}/${article.slug}`)}
              className="group p-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/90 via-brand-bg to-slate-950 hover:border-brand-primary/60 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-brand-primary/10 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-brand-muted">
                  <span className="inline-flex items-center gap-1 text-brand-primary font-bold">
                    {getCategoryIcon(article.category)} {article.category}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" /> {article.readTime}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                  {article.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {article.summary}
                </p>

                {/* Key Takeaways preview pill list */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Takeaway Preview:</p>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{article.keyTakeaways[0]}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border/20 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 font-medium">Level: {article.difficulty}</span>
                <span className="text-xs font-bold text-brand-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Read Deep Dive <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom AdSense Slot */}
        <AdSenseSlot slot={import.meta.env.VITE_ADSENSE_BOTTOM_SLOT} className="w-full my-6" />

        {/* Interactive Deep Learning Roadmap Banner */}
        <div className="p-8 rounded-[32px] border border-brand-border/40 bg-zinc-950/80 backdrop-blur-md text-center space-y-5">
          <div className="inline-flex p-3 rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Need Structured Sequential Lessons Instead of Articles?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
            Visit the 50-lesson interactive Typing Academy for hand-guided home row practice, numbers & symbols mastery, and speed tests with instant PDF diplomas.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/academy')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              Open Typing Academy <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-700 transition-colors"
            >
              Learn About TypeMentor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
