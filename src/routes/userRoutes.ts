/* /api/user */
import { Router } from "express";
import { UserController } from "../controller/UserController";
import UserValidation from "../validation/UserValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import { FeedController } from "../controller/FeedController";
import { Service } from "typedi";

@Service()
export class UserRouter {
  public router: Router;

  constructor(
    private feedController: FeedController,
    private userController: UserController
  ) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get(
      "/search",
      UserValidation.search(),
      validateRequest,
      expressWrapper(this.userController.searchUserHandler)
    );
    this.router.get(
      "/:username",
      UserValidation.profile(),
      validateRequest,
      expressWrapper(this.userController.userProfileHandler)
    );
    this.router.get(
      "/:username/posts",
      UserValidation.posts(),
      validateRequest,
      expressWrapper(this.feedController.getUserPostsHandler)
    );
  }
}
