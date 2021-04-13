/* /api/user */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import { userProfile, userPosts } from "../controller/UserController";
import UserValidation from "../validation/UserValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get(
  "/:user_id",
  authAccesstoken,
  UserValidation.profile(),
  validateRequest,
  userProfile
);
router.get(
  "/:user_id/posts",
  authAccesstoken,
  UserValidation.posts(),
  validateRequest,
  userPosts
);

export default router;
