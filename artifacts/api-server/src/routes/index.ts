import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/admin", adminRouter);
router.use(proxyRouter);

export default router;
