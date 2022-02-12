/* /api/post */
import { Router } from "express";
import { Service } from "typedi";
import { PostController } from "../controller/PostController";
import PostValidation from "../validation/PostValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";

@Service()
export class PostRouter {
  public router: Router;

  constructor(private postController: PostController) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.post(
      "/",
      PostValidation.create(),
      validateRequest,
      expressWrapper(this.postController.createPostHandler)
    );
    this.router.get(
      "/:id",
      PostValidation.post(),
      validateRequest,
      expressWrapper(this.postController.getPostHandler)
    );
    this.router.post(
      "/:id/like",
      PostValidation.post(),
      validateRequest,
      expressWrapper(this.postController.likePostHandler)
    );
    this.router.post(
      "/:id/unlike",
      PostValidation.post(),
      validateRequest,
      expressWrapper(this.postController.unLikePostHandler)
    );
  }
}
