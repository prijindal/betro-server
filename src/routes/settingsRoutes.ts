/* /api/settings */
import { Router } from "express";
import { Service } from "typedi";
import { SettingsController } from "../controller/SettingsController";
import SettingsValidation from "../validation/SettingsValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";

@Service()
export class SettingsRouter {
  public router: Router;

  constructor(private settingsController: SettingsController) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get(
      "/",
      expressWrapper(this.settingsController.GetUserSettingsHandler)
    );
    this.router.post(
      "/",
      SettingsValidation.saveSettings(),
      validateRequest,
      expressWrapper(this.settingsController.SaveUserSettingHandler)
    );
  }
}
