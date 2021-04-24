/* /api/feed */
import { Router } from "express";
import { getHomeFeed } from "../controller/FeedController";

const router = Router();

router.get("/", getHomeFeed);

export default router;
