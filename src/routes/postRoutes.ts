/* /api/post */
import { Router } from "express";
import { createPost } from "../controller/PostController";
import PostValidation from "../validation/PostValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", PostValidation.create(), validateRequest, createPost);
// router.get("/:id", PostValidation.profile(), userProfile);
// router.post("/:id/like", PostValidation.posts(), userPosts);

export default router;
