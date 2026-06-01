import { Router, type IRouter } from "express";
import healthRouter from "./health";
import flightsRouter from "./flights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(flightsRouter);

export default router;
