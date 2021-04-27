/* /api/account */
import { Router } from "express";
import AccountValidation from "../validation/AccountValidation";
import {
  whoAmi,
  getKeys,
  fetchCounts,
  fetchOwnPosts,
} from "../controller/LoginController";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import {
  GetProfilePictureHandler,
  GetProfileHandler,
  PostProfileHandler,
  PutProfileHandler,
} from "../controller/ProfileController";
import { UserProfileResponse } from "../interfaces/responses/UserProfileResponse";

const router = Router();

router.get("/whoami", whoAmi);
router.get("/keys", getKeys);
router.get("/count", fetchCounts);

router.get(
  "/profile_picture",
  expressWrapper<{}, string, {}, {}>(GetProfilePictureHandler)
);
router.get(
  "/profile",
  expressWrapper<{}, UserProfileResponse, {}, {}>(GetProfileHandler)
);
router.post(
  "/profile",
  AccountValidation.saveProfile(),
  validateRequest,
  expressWrapper<
    {},
    UserProfileResponse,
    {
      user_id: string;
      first_name: string;
      last_name: string;
      profile_picture: string;
    },
    {}
  >(PostProfileHandler)
);
router.put(
  "/profile",
  expressWrapper<
    {},
    UserProfileResponse,
    {
      user_id: string;
      first_name?: string;
      last_name?: string;
      profile_picture?: string;
    },
    {}
  >(PutProfileHandler)
);

router.get("/posts", fetchOwnPosts);

export default router;
