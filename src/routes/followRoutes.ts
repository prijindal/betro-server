/* /api/follow */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import {
  followUser,
  getApprovals,
  approveUser,
  getFollowers,
  getFollowees,
} from "../controller/FollowController";
import FollowValidation from "../validation/FollowValidation";

const router = Router();

router.get("/followers", authAccesstoken, getFollowers);
router.get("/followees", authAccesstoken, getFollowees);
router.get("/approvals", authAccesstoken, getApprovals);
router.post("/", authAccesstoken, FollowValidation.follow(), followUser);
// router.post(
//   "/unfollow",
//   authAccesstoken,
//   FollowValidation.unfollow(),
//   unFollowUser
// );
router.post(
  "/approve",
  authAccesstoken,
  FollowValidation.approve(),
  approveUser
);
// router.post(
//   "/:id/unapprove",
//   authAccesstoken,
//   FollowValidation.unapprove(),
//   unApproveUser
// );

export default router;
