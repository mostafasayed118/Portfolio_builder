import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../middleware/csrf";
import type { AuthenticatedRequest } from "../middleware/adminAuth";
import { validateParamId } from "../middleware/validateUuid";
import type { Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { created, badRequest, serverError, conflict } from "./api-response";
import { safeErrorMessage } from "./safe-error";
import { resolveActivePortfolioId, NoActivePortfolioError } from "./active-portfolio";
import { runCollectionQuery, updateByIdAndUser, softDeleteByIdAndUser } from "./route-helpers";
import { collectionMutate, isUniqueViolationError } from "@workspace/db/collection";

/** Structured conflict signal returned by the `findDuplicate` hook. */
export interface DuplicateMatch {
  id: string;
  name: string;
}

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
  /**
   * Optional duplicate detector. Runs after validation, before insert. When
   * it returns a match, the router responds 409 Conflict carrying the
   * existing row's id, so clients can offer an overwrite instead of stacking
   * a duplicate (e.g. two templates with the same name).
   */
  findDuplicate?: (
    supabase: SupabaseClient,
    data: Record<string, unknown>,
    userId: string | undefined,
  ) => Promise<DuplicateMatch | null>;
}

/**
 * Builds a standard admin CRUD router for a collection table:
 *   GET    /          → paginated list (RLS scopes reads to the caller)
 *   POST   /          → validate + insert (stamped with the active portfolio)
 *   PUT    /:id       → validate + update (RLS scopes the write)
 *   DELETE /:id       → soft delete (RLS scopes the write)
 *
 * `theme_presets` is the only non-tenanted collection: it keeps `user_id`
 * scoping instead of `portfolio_id` stamping.
 *
 * The four verb handlers are identical across projects/skills/experience/
 * certifications, so they live here once instead of being copy-pasted.
 */
export function createCollectionRouter(opts: CollectionRouterOptions): IRouter {
  const { table, entityName, schema, orderBy = "sort_order", orderAsc, insertDefaults } = opts;
  const router: IRouter = Router();

  router.get("/", async (req: AuthenticatedRequest, res: Response) => {
    return runCollectionQuery(req, res, table, { softDelete: true, orderBy, orderAsc });
  });

  router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return badRequest(res, result.error?.flatten().fieldErrors ?? {});
    }
    const data = result.data as Record<string, unknown>;
    if (opts.findDuplicate) {
      const existing = await opts.findDuplicate(supabase, data, req.user?.id);
      if (existing) {
        return conflict(res, "An item with this name already exists", {
          code: "DUPLICATE_NAME",
          existingId: existing.id,
        });
      }
    }
    const isTenanted = table !== "theme_presets";
    const insertData: Record<string, unknown> = { ...data };
    if (isTenanted) {
      try {
        insertData.portfolio_id = await resolveActivePortfolioId(req);
      } catch (error) {
        if (error instanceof NoActivePortfolioError) {
          return badRequest(res, { portfolioId: ["Create a portfolio first"] });
        }
        throw error;
      }
    } else {
      insertData.user_id = req.user?.id;
    }
    if (insertDefaults) {
      Object.assign(insertData, insertDefaults(data));
    }
    try {
      await collectionMutate(supabase, table, { action: "insert", row: insertData });
    } catch (error) {
      if (isUniqueViolationError(error) && opts.findDuplicate) {
        return conflict(res, "An item with this name already exists", {
          code: "DUPLICATE_NAME",
        });
      }
      return serverError(res, safeErrorMessage(error));
    }
    return created(res);
  });

  router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
    const result = schema.partial().safeParse(req.body);
    if (!result.success) {
      return badRequest(res, result.error?.flatten().fieldErrors ?? {});
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
