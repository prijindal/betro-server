/* /api/follow */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import { followUser } from "../controller/FollowController";
import FollowValidation from "../validation/FollowValidation";

const router = Router();

// router.get("/followers", authAccesstoken);
// router.get("/followees", authAccesstoken);
// router.get("/approvals", authAccesstoken);
router.post("/", authAccesstoken, FollowValidation.follow(), followUser);
// router.post(
//   "/unfollow",
//   authAccesstoken,
//   FollowValidation.unfollow(),
//   unFollowUser
// );
// router.post(
//   "/approve",
//   authAccesstoken,
//   FollowValidation.approve(),
//   approveUser
// );
// router.post(
//   "/:id/unapprove",
//   authAccesstoken,
//   FollowValidation.unapprove(),
//   unApproveUser
// );

export default router;
