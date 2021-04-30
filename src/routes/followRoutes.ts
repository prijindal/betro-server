/* /api/follow */
import { Router } from "express";
import {
  ApproveUserHandler,
  FollowUserHandler,
  FollowRequest,
  ApproveRequest,
  FollowResponse,
} from "../controller/FollowController/action";
import FollowValidation from "../validation/FollowValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import { GetFollowersHandler } from "../controller/FollowController/followers";
import { GetFolloweesHandler } from "../controller/FollowController/followees";
import { GetApprovalsHandler } from "../controller/FollowController/approvals";

const router = Router();

router.get("/followers", expressWrapper(GetFollowersHandler));
router.get("/followees", expressWrapper(GetFolloweesHandler));
router.get("/approvals", expressWrapper(GetApprovalsHandler));
router.post(
  "/",
  FollowValidation.follow(),
  validateRequest,
  expressWrapper<{}, FollowResponse, FollowRequest, {}>(FollowUserHandler)
);
// router.post(
//   "/unfollow",
//   FollowValidation.unfollow(),
//   unFollowUser
// );
router.post(
  "/approve",
  FollowValidation.approve(),
  validateRequest,
  expressWrapper<{}, { approved: boolean }, ApproveRequest, {}>(
    ApproveUserHandler
  )
);
// router.post(
//   "/:id/unapprove",
//   FollowValidation.unapprove(),
//   unApproveUser
// );

export default router;
