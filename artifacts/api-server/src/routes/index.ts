import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cvRouter from "./cv";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cvRouter);

export default router;
