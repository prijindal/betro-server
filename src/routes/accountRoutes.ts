/* /api/account */
import { Router } from "express";
import AccountValidation from "../validation/AccountValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import {
  UserProfileResponse,
  GetProfilePictureHandler,
  GetProfileHandler,
  PostProfileHandler,
  PutProfileHandler,
} from "../controller/ProfileController";
import {
  CountResponse,
  GetCountsHandler,
  GetKeysHandler,
  WhoAmiResponse,
  WhoAmiHandler,
} from "../controller/AccountController";
import {
  FetchOwnPostsHandler,
  PostsFeedResponse,
} from "../controller/FeedController";

const router = Router();

router.get(
  "/whoami",
  expressWrapper<{}, WhoAmiResponse, {}, {}>(WhoAmiHandler)
);
router.get(
  "/keys",
  expressWrapper<{}, { private_key: string; sym_key: string }, {}, {}>(
    GetKeysHandler
  )
);
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

router.get(
  "/posts",
  expressWrapper<{}, PostsFeedResponse, {}, {}>(FetchOwnPostsHandler)
);

export default router;
