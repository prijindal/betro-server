import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { AppHandlerFunction } from "../expressHelper";
import { NotificationController } from "../NotificationController";
import { FeedService } from "../../service/FeedService";
import { isEmpty } from "lodash";
import { ProfileGrantService } from "../../service/ProfileGrantService";
import {
  GroupPolicy,
  ProfileGrant,
  User,
  GroupFollowApproval,
  UserNotificationsActions,
} from "../../entities";

export interface FollowRequest {
  followee_id: string;
  own_key_id: string;
  followee_key_id?: string | null;
  encrypted_profile_sym_key?: string | null;
}

export interface FollowResponse {
  is_approved: boolean;
  id: string;
}

export interface ApproveRequest {
  follow_id: string;
  encrypted_group_sym_key: string;
  group_id: string;
  own_key_id: string;
  encrypted_profile_sym_key?: string;
}

@Service()
export class FollowActionController {
  constructor(
    private profileGrantService: ProfileGrantService,
    private notificationController: NotificationController,
    private feedService: FeedService,
    @InjectRepository(ProfileGrant)
    private readonly profileGrantRepository: Repository<ProfileGrant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GroupFollowApproval)
    private readonly groupFollowApprovalRepository: Repository<GroupFollowApproval>,
    @InjectRepository(GroupPolicy)
    private readonly groupPolicyRepository: Repository<GroupPolicy>
  ) {}

  FollowUserHandler: AppHandlerFunction<
    FollowRequest & { user_id: string },
    FollowResponse
  > = async (req) => {
    const user_id = req.user_id;
    const followee_id = req.followee_id;
    const followeeUser = await this.userRepository.findOne({ id: followee_id });
    if (followeeUser == null) {
      return {
        error: { status: 404, message: "User not found", data: null },
        response: null,
      };
    } else {
      const isFollowing = await this.groupFollowApprovalRepository.findOne({
        user_id,
        followee_id: followeeUser.id,
      });
      if (isFollowing != null) {
        return {
          error: {
            status: 411,
            message: isFollowing.is_approved
              ? "Already following"
              : "Waiting for approval",
            data: null,
          },
          response: null,
        };
      } else {
        let followResponse = this.groupFollowApprovalRepository.create({
          user_id,
          followee_id: followeeUser.id,
          user_key_id: req.own_key_id,
          followee_key_id: req.followee_key_id,
        });
        followResponse = await this.groupFollowApprovalRepository.save(
          followResponse
        );
        const user = await this.userRepository.findOne({ id: user_id });
        if (user != null) {
          await this.notificationController.sendUserNotification(
            followeeUser.id,
            UserNotificationsActions.notification_on_followed,
            `${user.username} asked to follow you`,
            { username: user.username }
          );
        }
        await this.profileGrantService.createGrant({
          user_id: followeeUser.id,
          user_key_id: req.followee_key_id,
          grantee_id: user_id,
          grantee_key_id: req.own_key_id,
        });
        this.profileGrantService.claimEcdhKeys([
          req.followee_key_id,
          req.own_key_id,
        ]);
        if (
          !isEmpty(req.encrypted_profile_sym_key) &&
          !isEmpty(req.followee_key_id)
        ) {
          await this.profileGrantService.createGrant({
            user_id: user_id,
            user_key_id: req.own_key_id,
            grantee_id: followeeUser.id,
            grantee_key_id: req.followee_key_id,
            encrypted_sym_key: req.encrypted_profile_sym_key,
          });
        }
        return {
          response: {
            is_approved: followResponse.is_approved,
            id: followResponse.user_id,
          },
          error: null,
        };
      }
    }
  };
  ApproveUserHandler: AppHandlerFunction<
    ApproveRequest & { user_id: string },
    { approved: boolean }
  > = async (req) => {
    const user_id = req.user_id;
    const follow_id = req.follow_id;
    const group_id = req.group_id;
    const approval = await this.groupFollowApprovalRepository.findOne(
      {
        followee_id: user_id,
        id: follow_id,
      },
      {
        select: ["id", "is_approved", "user_id"],
      }
    );
    if (approval == null || approval.is_approved) {
      return {
        error: {
          status: 404,
          message: approval.is_approved
            ? "Already approved"
            : "No follow like this",
          data: null,
        },
        response: null,
      };
    } else {
      const group = await this.groupPolicyRepository.find({
        user_id,
        id: group_id,
      });
      if (group == null) {
        return {
          error: {
            status: 404,
            message: "Group not found",
            data: null,
          },
          response: null,
        };
      } else {
        const approved = await this.groupFollowApprovalRepository.update(
          {
            followee_id: user_id,
            id: follow_id,
          },
          {
            is_approved: true,
            group_id,
            encrypted_sym_key: req.encrypted_group_sym_key,
            followee_key_id: req.own_key_id,
          }
        );
        const user = await this.userRepository.findOne({ id: user_id });
        if (user != null) {
          this.feedService.createUserFeed(user.id);
          await this.notificationController.sendUserNotification(
            approval.user_id,
            UserNotificationsActions.notification_on_approved,
            `${user.username} has approved your follow request`,
            { username: user.username }
          );
        }
        const profileGrant = await this.profileGrantService.createGrant({
          user_id: user_id,
          grantee_id: approval.user_id,
          user_key_id: req.own_key_id,
        });
        this.profileGrantService.claimEcdhKeys([
          req.own_key_id,
          profileGrant.grantee_key_id,
        ]);
        await this.profileGrantRepository.update(
          {
            id: profileGrant.id,
          },
          {
            encrypted_sym_key: req.encrypted_profile_sym_key,
          }
        );
        return {
          response: {
            approved: approved.affected === 1,
          },
          error: null,
        };
      }
    }
  };
}
