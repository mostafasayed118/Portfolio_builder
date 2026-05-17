import { Router, type IRouter } from "express";
import heroRouter from "./hero";
import aboutRouter from "./about";
import skillsRouter from "./skills";
import projectsRouter from "./projects";
import experienceRouter from "./experience";
import certificationsRouter from "./certifications";
import messagesRouter from "./messages";
import contactRouter from "./contact";
import contactInfoRouter from "./contact-info";
import themeSettingsRouter from "./theme-settings";
import typographySettingsRouter from "./typography-settings";
import seoSettingsRouter from "./seo-settings";
import sectionSettingsRouter from "./section-settings";
import siteSettingsRouter from "./site-settings";

const router: IRouter = Router();

router.use("/hero", heroRouter);
router.use("/about", aboutRouter);
router.use("/skills", skillsRouter);
router.use("/projects", projectsRouter);
router.use("/experience", experienceRouter);
router.use("/certifications", certificationsRouter);
router.use("/messages", messagesRouter);
router.use("/contact", contactRouter);
router.use("/contact-info", contactInfoRouter);
router.use("/theme-settings", themeSettingsRouter);
router.use("/typography-settings", typographySettingsRouter);
router.use("/seo-settings", seoSettingsRouter);
router.use("/section-settings", sectionSettingsRouter);
router.use("/site-settings", siteSettingsRouter);

export default router;
