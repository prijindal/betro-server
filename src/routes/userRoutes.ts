/* /api/user */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import { userProfile, userPosts } from "../controller/UserController";
import UserValidation from "../validation/UserValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get(
  "/:username",
  authAccesstoken,
  UserValidation.profile(),
  validateRequest,
  userProfile
);
router.get(
  "/:username/posts",
  authAccesstoken,
  UserValidation.posts(),
  validateRequest,
  userPosts
);

export default router;
