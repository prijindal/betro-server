/* /api/settings */
import { Router } from "express";
import {
  GetUserSettingsHandler,
  SaveUserSettingHandler,
} from "../controller/SettingsController";
import SettingsValidation from "../validation/SettingsValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";

const router = Router();

router.get("/", expressWrapper(GetUserSettingsHandler));

router.post(
  "/",
  SettingsValidation.saveSettings(),
  validateRequest,
  expressWrapper(SaveUserSettingHandler)
);

export default router;
