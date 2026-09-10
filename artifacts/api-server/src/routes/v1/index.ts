import { Router, type IRouter } from "express";
import cvRouter from "../cv";
import imagesRouter from "../images";
import adminRouter from "../admin";
import publicContactRouter from "../public/contact";
import publicPostsRouter from "../public/posts";
import publicChatRouter from "../public/chat";
import cspReportRouter from "../csp-report";
import { adminAuth } from "../../middleware/adminAuth";

const router: IRouter = Router();

// Note: the /healthz endpoint is NOT mounted here. See routes/health.ts:
// app.ts mounts it at both the top-level /api prefix and /api/v1,
// BEFORE the general rate limiter, so that:
//   - monitoring probes don't go through the general rate limiter
//   - the path is stable across v1 → v2 migrations
//   - the response shape is owned by the health route, not by v1
router.use(cvRouter);
router.use(imagesRouter);
router.use("/admin", adminAuth, adminRouter);
router.use("/contact", publicContactRouter);
router.use("/posts", publicPostsRouter);
router.use("/chat", publicChatRouter);
router.use(cspReportRouter);

export default router;
