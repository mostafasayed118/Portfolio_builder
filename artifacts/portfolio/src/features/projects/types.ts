export interface Project {
  /** DB rows carry their uuid; static fallback items keep numeric ids. */
  id: string | number;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  techStack: string[];
  category: string;
  featured?: boolean;
  githubUrl: string;
  liveUrl?: string;
  metrics?: string[];
  images: string[];
  completedAt: string;
  challenges?: string | null;
  outcome?: string | null;
  description?: string;
  imageId?: string;
  imageVariants?: ImageVariant[];
}

export interface ImageVariant {
  type: string;
  url: string;
}
