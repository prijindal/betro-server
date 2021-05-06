/* /api/post */
import { Router } from "express";
import {
  CreatePostHandler,
  GetPostHandler,
  LikePostHandler,
  UnLikePostHandler,
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
router.post(
  "/:id/like",
  PostValidation.post(),
  validateRequest,
  expressWrapper(LikePostHandler)
);
router.post(
  "/:id/unlike",
  PostValidation.post(),
  validateRequest,
  expressWrapper(UnLikePostHandler)
);

export default router;
