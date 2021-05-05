/* /api/user */
import { Router } from "express";
import {
  UserProfileHandler,
  SearchUserHandler,
} from "../controller/UserController";
import UserValidation from "../validation/UserValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import { GetUserPostsHandler } from "../controller/FeedController";

const router = Router();

router.get(
  "/search",
  UserValidation.search(),
  validateRequest,
  expressWrapper(SearchUserHandler)
);
router.get(
  "/:username",
  UserValidation.profile(),
  validateRequest,
  expressWrapper(UserProfileHandler)
);
router.get(
  "/:username/posts",
  UserValidation.posts(),
  validateRequest,
  expressWrapper(GetUserPostsHandler)
);

export default router;
