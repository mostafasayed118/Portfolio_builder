import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../middleware/csrf";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../middleware/validateUuid";
import type { Response } from "express";
import { getSupabaseClient } from "./supabase-client";
import { created, badRequest, serverError } from "./api-response";
import { runCollectionQuery, updateByIdAndUser, softDeleteByIdAndUser } from "./route-helpers";

/**
 * Structural shape of a Zod schema (safeParse + partial) sufficient for the
 * generic CRUD handlers. The real `@workspace/api-zod` schemas satisfy this.
 */
interface EntitySchema {
  safeParse(input: unknown): { success: boolean; data?: unknown; error?: { flatten(): { fieldErrors: Record<string, string[]> } } };
  partial(): EntitySchema;
}

export interface CollectionRouterOptions {
  table: string;
  entityName: string;
  schema: EntitySchema;
  orderBy?: string;
  orderAsc?: boolean;
  /** Extra fields merged into the insert payload (after user_id). */
  insertDefaults?: (data: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Builds a standard admin CRUD router for a collection table:
 *   GET    /          → paginated, user-scoped list (soft-delete aware)
 *   POST   /          → validate + insert (owned by the requesting user)
 *   PUT    /:id       → validate + update (scoped to the user)
 *   DELETE /:id       → soft delete (scoped to the user)
 *
 * The four verb handlers are identical across projects/skills/experience/
 * certifications, so they live here once instead of being copy-pasted.
 */
export function createCollectionRouter(opts: CollectionRouterOptions): IRouter {
  const { table, entityName, schema, orderBy = "sort_order", orderAsc, insertDefaults } = opts;
  const router: IRouter = Router();

  router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
    return runCollectionQuery(req, res, table, { softDelete: true, orderBy, orderAsc });
  });

  router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
    const supabase = getSupabaseClient();
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return badRequest(res, result.error!.flatten().fieldErrors);
    }
    const data = result.data as Record<string, unknown>;
    const insertData = {
      ...data,
      user_id: req.user?.id,
      ...(insertDefaults ? insertDefaults(data) : {}),
    };
    const { error } = await supabase.from(table).insert(insertData as never);
    if (error) return serverError(res, error.message);
    return created(res);
  });

  router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
    const result = schema.partial().safeParse(req.body);
    if (!result.success) {
      return badRequest(res, result.error!.flatten().fieldErrors);
    }
    return updateByIdAndUser(
      req,
      res,
      table,
      req.params.id as string,
      result.data as Record<string, unknown>,
      entityName,
    );
  });

  router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
    return softDeleteByIdAndUser(req, res, table, req.params.id as string, entityName);
  });

  return router;
}
