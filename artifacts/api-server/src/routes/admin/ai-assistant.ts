import { Router, type IRouter } from "express";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { Response } from "express";
import {
  aiGenerateDescriptionSchema,
  aiSuggestCategoriesSchema,
  aiSuggestTagsSchema,
  aiAnalyzeContentSchema,
} from "@workspace/api-zod";
import { badRequest, ok, serverError } from "../../lib/api-response";
import { generateContent, parseListResponse } from "../../lib/gemini";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

// Per-call request log (method, path, status, duration) so both successes and
// Gemini failures show up in Vercel runtime logs / log drains — the API has no
// request-level logging elsewhere, and these are the four endpoints the AI
// assistant admin tools hit.
router.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const log = res.statusCode >= 500 ? logger.warn.bind(logger) : logger.info.bind(logger);
    log(
      {
        path: req.originalUrl,
        method: req.method,
        status: res.statusCode,
        durationMs,
      },
      "ai-assistant request",
    );
  });
  next();
});

const generateDescriptionSchema = aiGenerateDescriptionSchema;
const suggestTagsSchema = aiSuggestTagsSchema;
const analyzeContentSchema = aiAnalyzeContentSchema;

// The category vocabulary the assistant is asked to pick from; responses are
// filtered against it so the returned values stay consistent with the admin UI.
const CATEGORY_WHITELIST = [
  "Frontend",
  "Backend",
  "Database",
  "DevOps",
  "Mobile",
  "AI/ML",
  "Tools",
  "Design",
];

interface ContentAnalysis {
  score: number;
  suggestions: string[];
  strengths: string[];
}

function parseContentAnalysis(text: string): ContentAnalysis | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.score !== "number") return null;
  return {
    score: Math.max(0, Math.min(100, Math.round(obj.score))),
    suggestions: Array.isArray(obj.suggestions) ? obj.suggestions.map(String).slice(0, 5) : [],
    strengths: Array.isArray(obj.strengths) ? obj.strengths.map(String).slice(0, 3) : [],
  };
}

router.post("/generate-description", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = generateDescriptionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return badRequest(res, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { techStack, title } = parseResult.data;
  const prompt =
    "You help a portfolio admin write project descriptions. Write a concise, professional 2-3 sentence " +
    `description for a project${title ? ` titled "${title}"` : ""} using this tech stack: ${techStack.join(", ")}. ` +
    "Plain text only — no quotes, no markdown.";

  try {
    const { text, attempts } = await generateContent(prompt, { temperature: 0.6 });
    const description = text.replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!description) {
      return serverError(res, "Gemini returned an empty description");
    }
    return ok(res, { description, attempts });
  } catch (err) {
    return serverError(res, err instanceof Error ? err.message : "Gemini request failed");
  }
});

router.post("/suggest-categories", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = aiSuggestCategoriesSchema.safeParse(req.body);
  if (!parseResult.success) {
    return badRequest(res, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { skillName } = parseResult.data;
  const prompt =
    `Given the skill "${skillName}" for a portfolio, suggest 1-3 categories from this exact list: ` +
    "Frontend, Backend, Database, DevOps, Mobile, AI/ML, Tools, Design. " +
    "Return only the category names, comma-separated.";

  try {
    const { text, attempts } = await generateContent(prompt, { temperature: 0.2 });
    const whitelist = new Set(CATEGORY_WHITELIST);
    const categories = parseListResponse(text, 3).filter((c) => whitelist.has(c));
    if (categories.length === 0) {
      return serverError(res, "Gemini returned no valid categories");
    }
    return ok(res, { categories, attempts });
  } catch (err) {
    return serverError(res, err instanceof Error ? err.message : "Gemini request failed");
  }
});

router.post("/suggest-tags", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = suggestTagsSchema.safeParse(req.body);
  if (!parseResult.success) {
    return badRequest(res, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { techStack, category } = parseResult.data;
  const prompt =
    `For a portfolio project using: ${techStack.join(", ")}${category ? ` (category ${category})` : ""}, ` +
    "suggest up to 5 short lowercase tags (1-2 words each). Return only the tags, comma-separated.";

  try {
    const { text, attempts } = await generateContent(prompt, { temperature: 0.4 });
    const tags = parseListResponse(text, 5);
    if (tags.length === 0) {
      return serverError(res, "Gemini returned no tags");
    }
    return ok(res, { tags, attempts });
  } catch (err) {
    return serverError(res, err instanceof Error ? err.message : "Gemini request failed");
  }
});

router.post("/analyze-content", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = analyzeContentSchema.safeParse(req.body);
  if (!parseResult.success) {
    return badRequest(res, parseResult.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const { content, contentType } = parseResult.data;
  const prompt =
    `Analyze this ${contentType} section from a portfolio for quality. Return STRICT JSON only, no markdown: ` +
    `{"score": 0-100, "suggestions": ["..."], "strengths": ["..."]}. Content:\n"""\n${content.slice(0, 3000)}\n"""`;

  try {
    const { text, attempts } = await generateContent(prompt, { temperature: 0.2 });
    const analysis = parseContentAnalysis(text);
    if (!analysis) {
      return serverError(res, "Gemini returned an unparseable analysis");
    }
    return ok(res, { ...analysis, attempts });
  } catch (err) {
    return serverError(res, err instanceof Error ? err.message : "Gemini request failed");
  }
});

export default router;
