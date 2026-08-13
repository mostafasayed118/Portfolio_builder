import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";
import { badRequest, serverError } from "../../lib/api-response";
import { seedHerContent, seedAboutContent, seedSkills, seedProjects, seedExperience, seedCertifications, softDeleteAll } from "../../lib/seed-data";

const router: IRouter = Router();

router.post("/", requireSuperadmin, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
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

  try {
    if (force) await softDeleteAll(supabase, userId);

    await seedHerContent(supabase);
    summary.hero = 1;

    await seedAboutContent(supabase);
    summary.about = 1;

    const skillResult = await seedSkills(supabase, userId, force);
    summary.skills = skillResult.count;
    errors.push(...skillResult.errors);

    const projectResult = await seedProjects(supabase, userId, force);
    summary.projects = projectResult.count;
    errors.push(...projectResult.errors);

    const expResult = await seedExperience(supabase, userId, force);
    summary.experience = expResult.count;
    errors.push(...expResult.errors);

    const certResult = await seedCertifications(supabase, userId, force);
    summary.certifications = certResult.count;
    errors.push(...certResult.errors);

    return res.json({ success: true, summary, errors });
  } catch (e) {
    return serverError(res, e instanceof Error ? e.message : "Failed to seed data");
  }
});

export default router;
