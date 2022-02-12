import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { UserPaginationWrapper } from "../../service/helper";
import { AppHandlerFunction } from "../expressHelper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import { FollowerResponse } from "../../interfaces/responses/UserResponses";
import {
  GroupFollowApproval,
  GroupPolicy,
  User,
  UserEcdhKey,
  ProfileGrant,
} from "../../entities";
import { ProfileGrantService } from "../../service/ProfileGrantService";

@Service()
export class FollowersController {
  constructor(
    private profileGrantService: ProfileGrantService,
    @InjectRepository(ProfileGrant)
    private readonly profileGrantRepository: Repository<ProfileGrant>,
    @InjectRepository(UserEcdhKey)
    private readonly userEcdhKeyRepository: Repository<UserEcdhKey>,
    @InjectRepository(GroupFollowApproval)
    private readonly groupFollowApprovalRepository: Repository<GroupFollowApproval>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GroupPolicy)
    private readonly groupPolicyRepository: Repository<GroupPolicy>
  ) {}
  getFollowersHandler: AppHandlerFunction<
    { after: string; limit: string; user_id: string },
    PaginatedResponse<FollowerResponse>
  > = async (req) => {
    const user_id = req.user_id;
    const { data, limit, after, total, next } =
      await UserPaginationWrapper<GroupFollowApproval>(
        this.groupFollowApprovalRepository
          .createQueryBuilder()
          .where("followee_id = :user_id and is_approved = true", { user_id }),
        req.limit,
        req.after
      );
    const group_ids = data.map((a) => a.group_id);
    const follower_ids = data.map((a) => a.user_id);
    const [groups, followers, isFollowings, userProfileWithGrants] =
      await Promise.all([
        group_ids.length === 0
          ? []
          : this.groupPolicyRepository
              .createQueryBuilder()
              .where("id in (:...group_ids)", { group_ids })
              .getMany(),
        follower_ids.length == 0
          ? []
          : this.userRepository
              .createQueryBuilder()
              .where("id in (:...user_ids)", { user_ids: follower_ids })
              .getMany(),
        follower_ids.length === 0
          ? []
          : this.groupFollowApprovalRepository
              .createQueryBuilder()
              .where("followee_id in (:...follower_ids)", { follower_ids })
              .getMany(),
        this.profileGrantService.fetchProfilesWithGrants(user_id, follower_ids),
      ]);
    const response: Array<FollowerResponse> = [];
    data.forEach((follow) => {
      const group = groups.find((a) => a.id == follow.group_id);
      const follower = followers.find((a) => a.id == follow.user_id);
      const isFollowing = isFollowings.find(
        (a) => a.followee_id == follow.user_id
      );
      if (group != null && follower != null) {
        const userProfileWithGrant = userProfileWithGrants.find(
          (a) => a.user_id == follow.user_id
        );
        const row: FollowerResponse = {
          user_id: follow.user_id,
          follow_id: follow.id,
          username: follower.username,
          group_id: group.id,
          group_name: group.name,
          group_is_default: group.is_default,
          is_following: isFollowing != null,
          is_following_approved: isFollowing != null && isFollowing.is_approved,
          ...this.profileGrantService.addProfileGrantToRow(
            userProfileWithGrant
          ),
        };
        response.push(row);
      }
    });
    return {
      response: { data: response, limit, after, total, next },
      error: null,
    };
  };
}
