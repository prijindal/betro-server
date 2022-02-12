/* /api/account */
import { Router } from "express";
import { Service } from "typedi";
import AccountValidation from "../validation/AccountValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";
import {
  UserProfileResponse,
  ProfileController,
} from "../controller/ProfileController";
import {
  CountResponse,
  WhoAmiResponse,
  AccountController,
  CountIncludeType,
} from "../controller/AccountController";
import { FeedController } from "../controller/FeedController";
import { PostsFeedResponse } from "../service/FeedService";

@Service()
export class AccountRouter {
  public router: Router;

  constructor(
    private profileController: ProfileController,
    private accountController: AccountController,
    private feedController: FeedController
  ) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get(
      "/whoami",
      expressWrapper<{}, WhoAmiResponse, {}, {}>(
        this.accountController.whoAmiHandler
      )
    );
    this.router.get(
      "/count",
      expressWrapper<
        {},
        CountResponse,
        {},
        { include_fields: string | Array<CountIncludeType> }
      >(this.accountController.getCountsHandler)
    );

    this.router.get(
      "/profile_picture",
      expressWrapper<{}, string, {}, {}>(
        this.profileController.GetProfilePictureHandler
      )
    );
    this.router.get(
      "/profile",
      expressWrapper<{}, UserProfileResponse, {}, {}>(
        this.profileController.GetProfileHandler
      )
    );
    this.router.post(
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
      >(this.profileController.PostProfileHandler)
    );
    this.router.put(
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
      >(this.profileController.PutProfileHandler)
    );

    this.router.get(
      "/posts",
      expressWrapper<{}, PostsFeedResponse, {}, {}>(
        this.feedController.fetchOwnPostsHandler
      )
    );
  }
}
