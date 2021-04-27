/* /api/account */
import { Router } from "express";
import AccountValidation from "../validation/AccountValidation";
import { getKeys, fetchOwnPosts } from "../controller/LoginController";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import {
  GetProfilePictureHandler,
  GetProfileHandler,
  PostProfileHandler,
  PutProfileHandler,
} from "../controller/ProfileController";
import { UserProfileResponse } from "../interfaces/responses/UserProfileResponse";
import {
  GetCountsHandler,
  WhoAmiHandler,
} from "../controller/AccountController";
import { WhoAmiResponse } from "../interfaces/responses/WhoAmiResponse";
import { CountResponse } from "../interfaces/responses/CountResponse";

const router = Router();

router.get(
  "/whoami",
  expressWrapper<{}, WhoAmiResponse, {}, {}>(WhoAmiHandler)
);
router.get("/keys", getKeys);
router.get(
  "/count",
  expressWrapper<{}, CountResponse, {}, { include_fields: string }>(
    GetCountsHandler
  )
);

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
