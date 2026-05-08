import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import adminRouter from "./admin";
import authRouter from "./auth";
import { adminAuth } from "../middleware/adminAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/admin", adminAuth, adminRouter);
router.use(proxyRouter);

export default router;
