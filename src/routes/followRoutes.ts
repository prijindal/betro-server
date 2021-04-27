/* /api/follow */
import { Router } from "express";
import {
  GetApprovalsHandler,
  GetFollowersHandler,
  GetFolloweesHandler,
  ApproveUserHandler,
  FollowUserHandler,
} from "../controller/FollowController";
import FollowValidation from "../validation/FollowValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import { FollowResponse, FollowRequest, ApproveRequest } from "../interfaces";

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
