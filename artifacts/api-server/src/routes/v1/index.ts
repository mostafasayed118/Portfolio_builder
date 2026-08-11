import { Router, type IRouter } from "express";
import cvRouter from "../cv";
import imagesRouter from "../images";
import adminRouter from "../admin";
import publicContactRouter from "../public/contact";
import cspReportRouter from "../csp-report";
import { adminAuth } from "../../middleware/adminAuth";

const router: IRouter = Router();

// Note: the /healthz endpoint is mounted at the top-level /api
// prefix in app.ts (not under /api/v1). See routes/health.ts. It
// intentionally sits outside the v1 router so that:
//   - monitoring probes don't go through the general rate limiter
//   - the path is stable across v1 → v2 migrations
//   - the response shape is owned by the health route, not by v1
router.use(cvRouter);
router.use(imagesRouter);
router.use("/admin", adminAuth, adminRouter);
router.use("/contact", publicContactRouter);
router.use(cspReportRouter);

export default router;
