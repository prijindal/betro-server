/* /api/notifications */
import { Router } from "express";
import { expressWrapper } from "../controller/expressHelper";
import {
  GetNotificationsHandler,
  ReadNotificationHandler,
} from "../controller/NotificationController";

const router = Router();

router.get("/", expressWrapper(GetNotificationsHandler));
router.post("/read", expressWrapper(ReadNotificationHandler));

export default router;
