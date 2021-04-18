/* /api/notifications */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import { getNotifications } from "../controller/NotificationController";

const router = Router();

router.get("/", authAccesstoken, getNotifications);

export default router;
