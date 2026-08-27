export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  publishedAt: string;
  updatedAt?: string;
  readTime: string;
  content: string;
}

export const BLOG_CATEGORIES = [
  "All",
  "Hospitality Tech",
  "Customer Experience",
  "Multilingual AI",
  "Analytics & ROI",
] as const;

export const blogPosts: BlogPost[] = [];

