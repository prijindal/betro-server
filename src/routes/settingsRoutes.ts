/* /api/settings */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import {
  getNotificationSettings,
  saveNotificationSetting,
} from "../controller/SettingsController";
import SettingsValidation from "../validation/SettingsValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/notifications", authAccesstoken, getNotificationSettings);

router.post(
  "/notifications",
  authAccesstoken,
  SettingsValidation.saveNotification(),
  validateRequest,
  saveNotificationSetting
);

export default router;
