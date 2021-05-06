/* /api/post */
import { Router } from "express";
import {
  CreatePostHandler,
  GetPostHandler,
} from "../controller/PostController";
import PostValidation from "../validation/PostValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";

const router = Router();

router.post(
  "/",
  PostValidation.create(),
  validateRequest,
  expressWrapper(CreatePostHandler)
);
router.get(
  "/:id",
  PostValidation.post(),
  validateRequest,
  expressWrapper(GetPostHandler)
);
// router.post("/:id/like", PostValidation.posts(), userPosts);

export default router;
