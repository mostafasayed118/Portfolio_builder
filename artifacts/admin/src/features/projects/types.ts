export type Project = {
  id: string;
  title: string;
  description: string;
  tech_stack: string[];
  category: string;
  featured: boolean;
  github_url: string;
  live_url?: string;
  metrics?: string[];
  sort_order: number;
  is_published: boolean;
  slug?: string;
  image_url?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

export const BLANK_PROJECT = {
  id: undefined as string | undefined,
  title: "",
  description: "",
  tech_stack: [] as string[],
  category: "Data Engineering",
  featured: false,
  github_url: "",
  live_url: "",
  metrics: [] as string[],
  sort_order: 999,
  is_published: true,
};
