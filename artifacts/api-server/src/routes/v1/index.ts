import { Router, type IRouter } from "express";
import healthRouter from "../health";
import cvRouter from "../cv";
import imagesRouter from "../images";
import adminRouter from "../admin";
import publicContactRouter from "../public/contact";
import { adminAuth } from "../../middleware/adminAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cvRouter);
router.use(imagesRouter);
router.use("/admin", adminAuth, adminRouter);
router.use("/contact", publicContactRouter);

export default router;
