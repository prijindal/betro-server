/* /api/post */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import { createPost } from "../controller/PostController";
import PostValidation from "../validation/PostValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post(
  "/",
  authAccesstoken,
  PostValidation.create(),
  validateRequest,
  createPost
);
// router.get("/:id", authAccesstoken, PostValidation.profile(), userProfile);
// router.post("/:id/like", authAccesstoken, PostValidation.posts(), userPosts);

export default router;
