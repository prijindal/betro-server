/* /api/settings */
import { Router } from "express";
import {
  getNotificationSettings,
  saveNotificationSetting,
} from "../controller/SettingsController";
import SettingsValidation from "../validation/SettingsValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/notifications", getNotificationSettings);

router.post(
  "/notifications",
  SettingsValidation.saveNotification(),
  validateRequest,
  saveNotificationSetting
);

export default router;
