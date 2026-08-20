export interface BlogFormData {
  id?: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  coverAlt?: string;
  category: string;
  tags: string[];
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  readTime: string;
  content: string;
  isPublished: boolean;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export type EditorMode = 'split' | 'markdown' | 'preview';
export type DeviceView = 'desktop' | 'tablet' | 'mobile';
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
