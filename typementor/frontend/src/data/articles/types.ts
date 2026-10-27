export interface GuideSection {
  id: string;
  title: string;
  content: string;
  proTip?: string;
  codeSnippet?: {
    language: string;
    code: string;
    caption?: string;
  };
}

export type ArticleCategory =
  | 'Typing Fundamentals'
  | 'Speed & Accuracy'
  | 'Practice & Routines'
  | 'Students & Careers'
  | 'Hardware & Ergonomics';

export type ArticleDifficulty =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'All Levels'
  | 'Beginner to Intermediate'
  | 'Intermediate to Advanced';

export interface GuideArticle {
  slug: string;
  title: string;
  subtitle: string;
  category: ArticleCategory;
  readTime: string;
  difficulty: ArticleDifficulty;
  publishedDate: string;
  author: string;
  authorRole: string;
  summary: string;
  keyTakeaways: string[];
  sections: GuideSection[];
  relatedSlugs: string[];
}
