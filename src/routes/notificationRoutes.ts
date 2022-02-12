/* /api/notifications */
import { Router } from "express";
import { Service } from "typedi";
import { expressWrapper } from "../controller/expressHelper";
import { NotificationController } from "../controller/NotificationController";

@Service()
export class NotificationRouter {
  public router: Router;

  constructor(private notificationController: NotificationController) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get(
      "/",
      expressWrapper(this.notificationController.GetNotificationsHandler)
    );
    this.router.post(
      "/read",
      expressWrapper(this.notificationController.ReadNotificationHandler)
    );
  }
}
