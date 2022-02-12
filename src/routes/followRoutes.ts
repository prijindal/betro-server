/* /api/follow */
import { Router } from "express";
import { Service } from "typedi";
import {
  FollowActionController,
  FollowRequest,
  ApproveRequest,
  FollowResponse,
} from "../controller/FollowController/action";
import FollowValidation from "../validation/FollowValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import { FollowersController } from "../controller/FollowController/followers";
import { FolloweesController } from "../controller/FollowController/followees";
import { ApprovalsController } from "../controller/FollowController/approvals";

@Service()
export class FollowRouter {
  public router: Router;

  constructor(
    private approvalsController: ApprovalsController,
    private followersController: FollowersController,
    private followeesController: FolloweesController,
    private followActionController: FollowActionController
  ) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get(
      "/followers",
      expressWrapper(this.followersController.getFollowersHandler)
    );
    this.router.get(
      "/followees",
      expressWrapper(this.followeesController.getFolloweesHandler)
    );
    this.router.get(
      "/approvals",
      expressWrapper(this.approvalsController.getApprovalsHandler)
    );
    this.router.post(
      "/",
      FollowValidation.follow(),
      validateRequest,
      expressWrapper<{}, FollowResponse, FollowRequest, {}>(
        this.followActionController.FollowUserHandler
      )
    );
    // router.post(
    //   "/unfollow",
    //   FollowValidation.unfollow(),
    //   unFollowUser
    // );
    this.router.post(
      "/approve",
      FollowValidation.approve(),
      validateRequest,
      expressWrapper<{}, { approved: boolean }, ApproveRequest, {}>(
        this.followActionController.ApproveUserHandler
      )
    );
    // router.post(
    //   "/:id/unapprove",
    //   FollowValidation.unapprove(),
    //   unApproveUser
    // );
  }
}
