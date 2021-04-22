/* /api/follow */
import { Router } from "express";
import {
  followUser,
  getApprovals,
  approveUser,
  getFollowers,
  getFollowees,
} from "../controller/FollowController";
import FollowValidation from "../validation/FollowValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/followers", getFollowers);
router.get("/followees", getFollowees);
router.get("/approvals", getApprovals);
router.post("/", FollowValidation.follow(), validateRequest, followUser);
// router.post(
//   "/unfollow",
//   FollowValidation.unfollow(),
//   unFollowUser
// );
router.post(
  "/approve",
  FollowValidation.approve(),
  validateRequest,
  approveUser
);
// router.post(
//   "/:id/unapprove",
//   FollowValidation.unapprove(),
//   unApproveUser
// );

export default router;
