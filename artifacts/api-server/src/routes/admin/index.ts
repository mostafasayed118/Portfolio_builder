import { Router, type IRouter } from "express";
import { adminLimiter, apiKeyLimiter } from "../../middleware/rateLimiter";
import heroRouter from "./hero";
import aboutRouter from "./about";
import skillsRouter from "./skills";
import projectsRouter from "./projects";
import experienceRouter from "./experience";
import certificationsRouter from "./certifications";
import messagesRouter from "./messages";
import contactInfoRouter from "./contact-info";
import themeSettingsRouter from "./theme-settings";
import typographySettingsRouter from "./typography-settings";
import seoSettingsRouter from "./seo-settings";
import sectionSettingsRouter from "./section-settings";
import siteSettingsRouter from "./site-settings";
import seedRouter from "./seed";
import aiAssistantRouter from "./ai-assistant";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(apiKeyLimiter);
router.use(adminLimiter);

router.use("/hero", heroRouter);
router.use("/about", aboutRouter);
router.use("/skills", skillsRouter);
router.use("/projects", projectsRouter);
router.use("/experience", experienceRouter);
router.use("/certifications", certificationsRouter);
router.use("/messages", messagesRouter);
router.use("/contact-info", contactInfoRouter);
router.use("/theme-settings", themeSettingsRouter);
router.use("/typography-settings", typographySettingsRouter);
router.use("/seo-settings", seoSettingsRouter);
router.use("/section-settings", sectionSettingsRouter);
router.use("/site-settings", siteSettingsRouter);
router.use("/seed", seedRouter);
router.use("/ai-assistant", aiAssistantRouter);
router.use("/users", usersRouter);

export default router;
