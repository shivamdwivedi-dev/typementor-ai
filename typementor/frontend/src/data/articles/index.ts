import { GuideArticle, ArticleCategory } from './types';
import { FUNDAMENTALS_ARTICLES } from './fundamentals';
import { SPEED_ACCURACY_ARTICLES } from './speedAccuracy';
import { PRACTICE_PLANS_ARTICLES } from './practicePlans';
import { STUDENTS_CAREERS_ARTICLES } from './studentsCareers';
import { TOOLS_TECHNIQUE_ARTICLES } from './toolsTechnique';

export * from './types';
export * from './fundamentals';
export * from './speedAccuracy';
export * from './practicePlans';
export * from './studentsCareers';
export * from './toolsTechnique';

export const ARTICLE_CATEGORIES: ('All Articles' | ArticleCategory)[] = [
  'All Articles',
  'Typing Fundamentals',
  'Speed & Accuracy',
  'Practice & Routines',
  'Students & Careers',
  'Hardware & Ergonomics',
];

export const ALL_20_ARTICLES: GuideArticle[] = [
  ...FUNDAMENTALS_ARTICLES,
  ...SPEED_ACCURACY_ARTICLES,
  ...PRACTICE_PLANS_ARTICLES,
  ...STUDENTS_CAREERS_ARTICLES,
  ...TOOLS_TECHNIQUE_ARTICLES,
];

export function getArticleBySlug(slug: string): GuideArticle | undefined {
  return ALL_20_ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: ArticleCategory | 'All Articles'): GuideArticle[] {
  if (category === 'All Articles') return ALL_20_ARTICLES;
  return ALL_20_ARTICLES.filter((a) => a.category === category);
}

export function getRelatedArticles(currentSlug: string, count = 3): GuideArticle[] {
  const current = getArticleBySlug(currentSlug);
  if (!current) return ALL_20_ARTICLES.slice(0, count);

  // First prioritize explicitly listed relatedSlugs
  const explicit = ALL_20_ARTICLES.filter((a) => current.relatedSlugs.includes(a.slug));
  if (explicit.length >= count) return explicit.slice(0, count);

  // Then fill with articles from the same category
  const sameCategory = ALL_20_ARTICLES.filter(
    (a) => a.slug !== currentSlug && a.category === current.category && !explicit.some((e) => e.slug === a.slug)
  );

  const combined = [...explicit, ...sameCategory];
  if (combined.length >= count) return combined.slice(0, count);

  // Fallback to remaining articles
  const remaining = ALL_20_ARTICLES.filter(
    (a) => a.slug !== currentSlug && !combined.some((c) => c.slug === a.slug)
  );

  return [...combined, ...remaining].slice(0, count);
}
