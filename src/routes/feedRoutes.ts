/* /api/feed */
import { Router } from "express";
import { expressWrapper } from "../controller/expressHelper";
import { GetHomeFeedHandler } from "../controller/FeedController";

const router = Router();

router.get("/", expressWrapper(GetHomeFeedHandler));

export default router;
