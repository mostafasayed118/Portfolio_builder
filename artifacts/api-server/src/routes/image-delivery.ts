import { Router, type IRouter, type Response } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { z } from "zod";
import { adminAuth, type AuthenticatedRequest } from "../middleware/adminAuth";
import { getAnonSupabaseClient, getRequestSupabaseClient } from "../lib/supabase-client";
import { notFound } from "../lib/api-response";
import { env } from "../lib/env";

const router: IRouter = Router();
const buckets = new Set(["project_images", "projects", "certifications", "avatars"]);

router.use("/images/serve", (req: AuthenticatedRequest, res, next) => {
  if (req.headers.authorization) {
    adminAuth(req, res, next);
    return;
  }
  next();
});

async function serve(req: AuthenticatedRequest, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "private, no-store");
  res.vary("Authorization");
  const anon = getAnonSupabaseClient();
  const client = req.clerkToken ? getRequestSupabaseClient(req.clerkToken) : anon;
  try {
    let bucket = "project_images";
    let path: string;
    let portfolioId: string;
    const id = req.params.id;
    if (typeof id === "string") {
      if (!z.string().uuid().safeParse(id).success) {
        notFound(res, "Image not found");
        return;
      }
      const { data, error } = await client.from("image_metadata")
        .select("storage_path, portfolio_id").eq("id", id).maybeSingle();
      if (error || !data?.portfolio_id || !data.storage_path.startsWith(`${data.portfolio_id}/`)) {
        notFound(res, "Image not found");
        return;
      }
      path = data.storage_path;
      portfolioId = data.portfolio_id;
    } else {
      const segments = req.params.path;
      bucket = typeof req.params.bucket === "string" ? req.params.bucket : "";
      path = Array.isArray(segments) ? segments.join("/") : segments ?? "";
      portfolioId = path.split("/")[0];
    }
    if (!buckets.has(bucket) || !z.string().uuid().safeParse(portfolioId).success ||
      // eslint-disable-next-line no-control-regex -- intentional control-character strip
      !path.includes("/") || path.split("/").some((part) => !part || part === "." || part === ".." || /[\\%\x00-\x1f]/.test(part))) {
      notFound(res, "Image not found");
      return;
    }
    const { data: published, error: publicationError } = await anon.from("public_portfolios")
      .select("id").eq("id", portfolioId).eq("is_published", true).maybeSingle();
    if (publicationError) {
      notFound(res, "Image not found");
      return;
    }
    if (!published) {
      if (!req.clerkSub || !req.clerkToken) {
        notFound(res, "Image not found");
        return;
      }
      const { data: owned, error } = await client.from("portfolios")
        .select("id, owner_user_id").eq("id", portfolioId).eq("owner_user_id", req.clerkSub).maybeSingle();
      if (error || owned?.owner_user_id !== req.clerkSub) {
        notFound(res, "Image not found");
        return;
      }
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    res.on("close", abort);
    try {
      const upstream = await fetch(`${env.SUPABASE_URL}/storage/v1/object/authenticated/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, {
        headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${req.clerkToken ?? env.SUPABASE_ANON_KEY}` },
        signal: controller.signal,
      });
      const contentType = upstream.headers.get("content-type")?.split(";")[0];
      if (!upstream.ok || !upstream.body || !contentType || !["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(contentType)) {
        await upstream.body?.cancel();
        notFound(res, "Image not found");
        return;
      }
      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Content-Type-Options", "nosniff");
      await pipeline(Readable.from(upstream.body), res);
    } finally {
      res.off("close", abort);
    }
  } catch {
    if (!res.headersSent) {
      notFound(res, "Image not found");
      return;
    }
    res.destroy();
  }
}

router.get("/images/serve/:id", serve);
router.get("/images/serve/:bucket/*path", serve);
export default router;
