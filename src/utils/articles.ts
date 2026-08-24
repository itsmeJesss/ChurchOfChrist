export interface Article {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorPhoto?: string;
  authorEmail?: string;
  createdAt: any;
  reactions?: {
    heart: number;
    thumbsUp: number;
  };
  commentCount?: number;
}

export const INITIAL_ARTICLES: Article[] = [];

export const getArticleDateMs = (v: any): number => {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  if (v instanceof Date) return v.getTime();
  const parsed = new Date(v).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

export const mergeAndSortArticles = (dbArticles: Article[]): Article[] => {
  const map = new Map<string, Article>();

  // Overwrite/insert only real user-created DB articles
  dbArticles.forEach(art => {
    // Filter out previous seed articles
    if (
      art.id === 'seed-grace-and-peace' || 
      art.id === 'seed-prayer-and-fellowship' || 
      art.id?.startsWith('seed-') ||
      art.title?.includes('Walking in Grace and Truth') ||
      art.title?.includes('The Power of Gathering')
    ) {
      return;
    }

    map.set(art.id, {
      ...art,
      reactions: art.reactions || { heart: 0, thumbsUp: 0 },
      commentCount: typeof art.commentCount === 'number' ? art.commentCount : 0
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    return getArticleDateMs(b.createdAt) - getArticleDateMs(a.createdAt);
  });
};

