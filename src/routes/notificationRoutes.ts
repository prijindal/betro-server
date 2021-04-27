/* /api/notifications */
import { Router } from "express";
import { expressWrapper } from "../controller/expressHelper";
import { GetNotificationsHandler } from "../controller/NotificationController";

const router = Router();

router.get("/", expressWrapper(GetNotificationsHandler));

export default router;
