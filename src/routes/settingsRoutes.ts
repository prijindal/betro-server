/* /api/settings */
import { Router } from "express";
import {
  getUserSettings,
  saveUserSetting,
} from "../controller/SettingsController";
import SettingsValidation from "../validation/SettingsValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", getUserSettings);

router.post(
  "/",
  SettingsValidation.saveNotification(),
  validateRequest,
  saveUserSetting
);

export default router;
