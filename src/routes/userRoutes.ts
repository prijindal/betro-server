/* /api/user */
import { Router } from "express";
import { userProfile, userPosts } from "../controller/UserController";
import UserValidation from "../validation/UserValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get(
  "/:username",
  UserValidation.profile(),
  validateRequest,
  userProfile
);
router.get(
  "/:username/posts",
  UserValidation.posts(),
  validateRequest,
  userPosts
);

export default router;
