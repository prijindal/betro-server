/* /api/notifications */
import { Router } from "express";
import { getNotifications } from "../controller/NotificationController";

const router = Router();

router.get("/", getNotifications);

export default router;
