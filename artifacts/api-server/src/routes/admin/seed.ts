import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { Response } from "express";
import { badRequest, ok, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { resolveActivePortfolioId, NoActivePortfolioError } from "../../lib/active-portfolio";
import { seedHerContent, seedAboutContent, seedSkills, seedProjects, seedExperience, seedCertifications, seedPosts, softDeleteAll } from "../../lib/seed-data";

const router: IRouter = Router();

router.post("/", requireSuperadmin, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = req.supabase;
  if (!supabase) {
    return serverError(res, "Request client not initialized");
  }
  const errors: string[] = [];
  const summary: Record<string, number> = {};
  const force = req.query.force === "true";
  const userId = req.user?.id;

  if (force && req.query.confirm !== "true") {
    return badRequest(res, { _force: ["Force re-seed requires confirm=true query param to prevent accidental data loss"] });
  }

  if (!userId) {
    return badRequest(res, { _auth: ["No user context. Please log in again."] });
  }

  let portfolioId: string;
  try {
    portfolioId = await resolveActivePortfolioId(req);
  } catch (error) {
    if (error instanceof NoActivePortfolioError) {
      return badRequest(res, { portfolioId: ["Create a portfolio first"] });
    }
    throw error;
  }

  try {
    if (force) await softDeleteAll(supabase, portfolioId);

    await seedHerContent(supabase, portfolioId);
    summary.hero = 1;

    await seedAboutContent(supabase, portfolioId);
    summary.about = 1;

    const skillResult = await seedSkills(supabase, portfolioId, force);
    summary.skills = skillResult.count;
    errors.push(...skillResult.errors);

    const projectResult = await seedProjects(supabase, portfolioId, force);
    summary.projects = projectResult.count;
    errors.push(...projectResult.errors);

    const expResult = await seedExperience(supabase, portfolioId, force);
    summary.experience = expResult.count;
    errors.push(...expResult.errors);

    const certResult = await seedCertifications(supabase, portfolioId, force);
    summary.certifications = certResult.count;
    errors.push(...certResult.errors);

    const postResult = await seedPosts(supabase, portfolioId);
    summary.posts = postResult.count;
    errors.push(...postResult.errors);

    return ok(res, { summary, errors });
  } catch (e) {
    return respondDbError(res, e);
  }
});

export default router;
