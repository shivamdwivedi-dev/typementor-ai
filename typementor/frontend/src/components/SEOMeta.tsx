/**
 * SEOMeta.tsx
 * A reusable component that sets per-page <title>, <meta description>,
 * <link rel="canonical">, Open Graph, and Twitter Card tags using react-helmet-async.
 *
 * Usage:
 *   <SEOMeta
 *     title="TypeMentor AI — Adaptive Typing Coach"
 *     description="..."
 *     canonical="https://typementor.dev/"
 *   />
 */

import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://typementor-ai-frontend.vercel.app';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOMetaProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  jsonLd?: object | null;
}

export default function SEOMeta({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
  jsonLd = null,
}: SEOMetaProps) {
  const fullCanonical = canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`;

  return (
    <Helmet>
      {/* ── Primary ── */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonical} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* ── Open Graph ── */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="TypeMentor AI" />

      {/* ── Twitter Card ── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullCanonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* ── JSON-LD Structured Data ── */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
