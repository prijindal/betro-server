import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { AppHandlerFunction } from "./expressHelper";
import {
  UserNotification,
  Post,
  UserSettings,
  GroupPolicy,
  Conversation,
  GroupFollowApproval,
  User,
  UserProfile,
} from "../entities";

export interface WhoAmiResponse {
  user_id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export type CountIncludeType =
  | "notifications"
  | "settings"
  | "groups"
  | "followers"
  | "followees"
  | "approvals"
  | "posts"
  | "conversations";

export interface CountResponse {
  notifications?: number;
  settings?: number;
  groups?: number;
  followers?: number;
  followees?: number;
  approvals?: number;
  posts?: number;
  conversations?: number;
}

@Service()
export class AccountController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(GroupFollowApproval)
    private readonly groupFollowApprovalRepository: Repository<GroupFollowApproval>,
    @InjectRepository(UserNotification)
    private readonly userNotificationRepository: Repository<UserNotification>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
    @InjectRepository(GroupPolicy)
    private readonly groupPolicyRepository: Repository<GroupPolicy>
  ) {}

  whoAmiHandler: AppHandlerFunction<{ user_id: string }, WhoAmiResponse> =
    async (req) => {
      const user_id = req.user_id;
      const user = await this.userRepository.findOne({ id: user_id });
      if (user == null) {
        return {
          response: null,
          error: {
            status: 503,
            message: "Some error occurred",
            data: null,
          },
        };
      } else {
        const response: WhoAmiResponse = {
          user_id,
          email: user.email,
          username: user.username,
        };
        const profile = await this.userProfileRepository.findOne(
          { user_id: user_id },
          { select: ["id", "user_id", "first_name", "last_name"] }
        );
        if (profile != null) {
          response.first_name = profile.first_name;
          response.last_name = profile.last_name;
        }
        return {
          response,
          error: null,
        };
      }
    };

  getCountsHandler: AppHandlerFunction<
    { user_id: string; include_fields: string | Array<CountIncludeType> },
    CountResponse
  > = async (req) => {
    const user_id = req.user_id;
    const response: CountResponse = {};
    const includeFieldsString = req.include_fields;
    const include_fields: Array<CountIncludeType> =
      typeof includeFieldsString == "string"
        ? (includeFieldsString.split(",") as Array<CountIncludeType>)
        : includeFieldsString;
    const promises: Array<Promise<number>> = [];
    for (const include_field of include_fields) {
      if (include_field == "followers") {
        promises.push(
          this.groupFollowApprovalRepository.count({
            followee_id: user_id,
            is_approved: true,
          })
        );
      } else if (include_field == "approvals") {
        promises.push(
          this.groupFollowApprovalRepository.count({
            followee_id: user_id,
            is_approved: false,
          })
        );
      } else if (include_field == "notifications") {
        promises.push(
          this.userNotificationRepository.count({
            user_id,
            read: false,
          })
        );
      } else if (include_field == "conversations") {
        promises.push(
          this.conversationRepository
            .createQueryBuilder()
            .where("sender_id = :user_id OR receiver_id = :user_id", {
              user_id: user_id,
            })
            .getCount()
        );
      } else if (include_field == "followees") {
        promises.push(
          this.groupFollowApprovalRepository.count({
            user_id,
          })
        );
      } else if (include_field == "posts") {
        promises.push(
          this.postRepository.count({
            user_id,
          })
        );
      } else if (include_field == "settings") {
        promises.push(
          this.userSettingsRepository.count({
            user_id,
          })
        );
      } else if (include_field == "groups") {
        promises.push(
          this.groupPolicyRepository.count({
            user_id,
          })
        );
      }
    }
    const resp = await Promise.all(promises);
    for (let index = 0; index < include_fields.length; index++) {
      const include_field = include_fields[index];
      response[include_field] = resp[index];
    }
    return {
      response,
      error: null,
    };
  };
}
