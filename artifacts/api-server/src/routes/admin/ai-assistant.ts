import { Router, type IRouter } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { Response } from "express";
import { z } from "zod";

const router: IRouter = Router();

const generateDescriptionSchema = z.object({
  techStack: z.array(z.string()).min(1),
  title: z.string().optional(),
});

const suggestTagsSchema = z.object({
  techStack: z.array(z.string()).min(1),
  category: z.string().optional(),
});

const analyzeContentSchema = z.object({
  content: z.string().min(1),
  contentType: z.enum(["hero", "about", "project"]),
});

const skillKeywordCategories: Record<string, string[]> = {
  "Frontend": ["react", "vue", "angular", "javascript", "typescript", "css", "html", "tailwind", "sass", "next", "nuxt", "svelte", "astro", "remix", "gatsby", "bootstrap", "material", "chakra", "antd", "mui", "framer"],
  "Backend": ["node", "express", "python", "django", "flask", "fastapi", "ruby", "rails", "php", "laravel", "java", "spring", "go", "gin", "rust", "c#", ".net", "asp.net", "graphql", "rest", "api"],
  "Database": ["sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "sqlite", "prisma", "drizzle", "supabase", "firebase", "dynamodb", "elasticsearch", "neo4j"],
  "DevOps": ["docker", "kubernetes", "k8s", "aws", "gcp", "azure", "vercel", "netlify", "heroku", "digitalocean", "ci/cd", "jenkins", "github actions", "circleci", "terraform", "ansible", "nginx", "apache"],
  "Mobile": ["react native", "flutter", "ionic", "cordova", "swift", "kotlin", "android", "ios", "expo"],
  "AI/ML": ["tensorflow", "pytorch", "keras", "opencv", "nlp", "chatgpt", "openai", "llm", "machine learning", "deep learning", "data science", "pandas", "numpy", "scikit"],
  "Tools": ["git", "github", "gitlab", "bitbucket", "npm", "yarn", "pnpm", "webpack", "vite", "rollup", "esbuild", "jest", "vitest", "cypress", "playwright", "testing library", "storybook"],
  "Design": ["figma", "sketch", "adobe", "photoshop", "illustrator", "xd", "zeplin", "invision", "prototyping", "ui/ux", "motion"],
};

function generateProjectDescription(techStack: string[], title?: string): string {
  const techDescriptions: Record<string, string> = {
    "react": "Built with React for a dynamic, interactive user experience with component-based architecture.",
    "next": "Developed using Next.js for server-side rendering, optimal SEO, and fast page loads.",
    "vue": "Powered by Vue.js with reactive data binding and component-based design.",
    "node": "Backend powered by Node.js for scalable, event-driven architecture.",
    "python": "Leverages Python's powerful libraries for robust functionality.",
    "django": "Built with Django, providing a secure and scalable Python backend.",
    "fastapi": "Uses FastAPI for high-performance, type-safe REST API endpoints.",
    "graphql": "Implements GraphQL for flexible, efficient data fetching.",
    "postgresql": "Uses PostgreSQL for reliable, ACID-compliant data storage.",
    "mongodb": "Stores data in MongoDB for flexible, JSON-like document storage.",
    "redis": "Implements Redis for caching and high-performance data operations.",
    "docker": "Containerized with Docker for easy deployment and scalability.",
    "kubernetes": "Orchestrated on Kubernetes for automatic scaling and management.",
    "aws": "Deployed on AWS for cloud-native, scalable infrastructure.",
    "tailwind": "Styled with Tailwind CSS for modern, utility-first design.",
    "typescript": "Written in TypeScript for type safety and better developer experience.",
    "prisma": "Uses Prisma ORM for type-safe database interactions.",
    "supabase": "Powered by Supabase for real-time functionality and authentication.",
    "firebase": "Uses Firebase for authentication, real-time database, and hosting.",
  };

  const parts: string[] = [];

  if (title) {
    parts.push(`${title} is a`);
  } else {
    parts.push("This project is a");
  }

  const hasFrontend = techStack.some(t => ["react", "next", "vue", "angular", "svelte", "astro"].includes(t.toLowerCase()));
  const hasBackend = techStack.some(t => ["node", "python", "django", "fastapi", "go", "ruby", "php"].includes(t.toLowerCase()));
  const hasDb = techStack.some(t => ["postgresql", "mysql", "mongodb", "redis", "supabase", "firebase"].includes(t.toLowerCase()));
  const hasCloud = techStack.some(t => ["aws", "gcp", "azure", "docker", "kubernetes", "vercel", "netlify"].includes(t.toLowerCase()));

  if (hasFrontend && hasBackend) {
    parts.push("full-stack web application");
  } else if (hasFrontend) {
    parts.push("modern web application");
  } else if (hasBackend) {
    parts.push("backend service");
  } else {
    parts.push("web-based project");
  }

  const descriptions: string[] = [];
  for (const tech of techStack) {
    const lowerTech = tech.toLowerCase();
    if (techDescriptions[lowerTech]) {
      descriptions.push(techDescriptions[lowerTech]);
    }
  }

  if (descriptions.length > 0) {
    parts.push("that combines");
    parts.push(descriptions.slice(0, 2).join(" ").replace(/^./, s => s.toUpperCase()));
  }

  if (hasDb) {
    parts.push("Data is stored securely using modern database technology.");
  }

  if (hasCloud) {
    parts.push("Deployed on cloud infrastructure for reliability and scalability.");
  }

  return parts.join(" ");
}

function suggestCategories(skillName: string): string[] {
  const lowerName = skillName.toLowerCase();
  const matched: string[] = [];

  for (const [category, keywords] of Object.entries(skillKeywordCategories)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        matched.push(category);
        break;
      }
    }
  }

  if (matched.length === 0) {
    matched.push("Other");
  }

  return [...new Set(matched)];
}

function suggestProjectTags(techStack: string[], category?: string): string[] {
  const tagSuggestions: Record<string, string[]> = {
    "Frontend": ["frontend", "ui", "responsive", "interactive"],
    "Full-Stack": ["fullstack", "webapp", "mvp"],
    "E-commerce": ["e-commerce", "shopping", "payment"],
    "API": ["api", "backend", "microservice"],
    "Real-time": ["real-time", "websocket", "live"],
    "Dashboard": ["dashboard", "analytics", "admin"],
    "SaaS": ["saas", "subscription", "multi-tenant"],
    "Mobile": ["mobile", "pwa", "responsive"],
    "Open Source": ["open-source", "github"],
    "AI/ML": ["ai", "machine-learning", "nlp"],
  };

  const tags: string[] = [];

  if (category) {
    if (tagSuggestions[category]) {
      tags.push(...tagSuggestions[category]);
    }
  }

  const hasReact = techStack.some(t => ["react", "next", "react native"].includes(t.toLowerCase()));
  const hasNode = techStack.some(t => ["node", "express"].includes(t.toLowerCase()));
  const hasAI = techStack.some(t => ["openai", "chatgpt", "tensorflow", "pytorch"].includes(t.toLowerCase()));

  if (hasReact && hasNode) {
    tags.push("fullstack", "webapp");
  }
  if (hasAI) {
    tags.push("ai", "machine-learning");
  }

  return [...new Set(tags)].slice(0, 5);
}

function analyzeContent(content: string, contentType: string): { score: number; suggestions: string[]; strengths: string[] } {
  const suggestions: string[] = [];
  const strengths: string[] = [];
  let score = 100;

  const wordCount = content.split(/\s+/).length;
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

  if (contentType === "hero") {
    if (wordCount < 10) {
      suggestions.push("Add a brief introduction about yourself");
      score -= 10;
    } else {
      strengths.push("Good length for a hero section");
    }

    if (!content.includes("@") && !content.includes("mailto")) {
      suggestions.push("Consider adding your email for contact opportunities");
      score -= 5;
    }

    if (content.length > 200) {
      suggestions.push("Hero text is quite long - consider condensing key points");
      score -= 5;
    }
  }

  if (contentType === "about") {
    if (wordCount < 50) {
      suggestions.push("Consider adding more details about your background and experience");
      score -= 15;
    } else {
      strengths.push("Good depth of content");
    }

    if (!content.toLowerCase().includes("year") && !content.toLowerCase().includes("experience")) {
      suggestions.push("Add your years of experience");
      score -= 5;
    }

    if (!content.toLowerCase().includes("focus") && !content.toLowerCase().includes("specialize")) {
      suggestions.push("Mention your areas of expertise or focus");
      score -= 5;
    }
  }

  if (contentType === "project") {
    if (wordCount < 30) {
      suggestions.push("Add more details about the project functionality");
      score -= 10;
    } else {
      strengths.push("Good project description");
    }

    if (!content.toLowerCase().includes("built") && !content.toLowerCase().includes("developed")) {
      suggestions.push("Mention what you built or developed");
      score -= 5;
    }
  }

  if (!content.includes(".")) {
    suggestions.push("Add proper punctuation for better readability");
    score -= 5;
  }

  const capsCount = (content.match(/[A-Z]/g) || []).length;
  if (capsCount / content.length > 0.3) {
    suggestions.push("Reduce excessive capitalization");
    score -= 5;
  }

  return {
    score: Math.max(0, score),
    suggestions: suggestions.slice(0, 5),
    strengths: strengths.slice(0, 3),
  };
}

router.post("/generate-description", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = generateDescriptionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: parseResult.error.message });
  }

  const { techStack, title } = parseResult.data;
  const description = generateProjectDescription(techStack, title);

  return res.json({ success: true, data: { description } });
});

router.post("/suggest-categories", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = z.object({ skillName: z.string().min(1) }).safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: parseResult.error.message });
  }

  const { skillName } = parseResult.data;
  const categories = suggestCategories(skillName);

  return res.json({ success: true, data: { categories } });
});

router.post("/suggest-tags", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = suggestTagsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: parseResult.error.message });
  }

  const { techStack, category } = parseResult.data;
  const tags = suggestProjectTags(techStack, category);

  return res.json({ success: true, data: { tags } });
});

router.post("/analyze-content", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = analyzeContentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, message: parseResult.error.message });
  }

  const { content, contentType } = parseResult.data;
  const analysis = analyzeContent(content, contentType);

  return res.json({ success: true, data: analysis });
});

export default router;