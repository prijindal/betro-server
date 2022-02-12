/* /api/feed */
import { Router } from "express";
import { Service } from "typedi";
import { expressWrapper } from "../controller/expressHelper";
import { FeedController } from "../controller/FeedController";

@Service()
export class FeedRouter {
  public router: Router;

  constructor(private feedController: FeedController) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get(
      "/",
      expressWrapper(this.feedController.getHomeFeedHandler)
    );
  }
}
