import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { UserPaginationWrapper } from "../../service/helper";
import { AppHandlerFunction } from "../expressHelper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import {
  GroupFollowApproval,
  User,
  UserEcdhKey,
  ProfileGrant,
} from "../../entities";
import { ProfileGrantService } from "../../service/ProfileGrantService";
import { FolloweeResponse } from "../../interfaces/responses/UserResponses";

@Service()
export class FolloweesController {
  constructor(
    private profileGrantService: ProfileGrantService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProfileGrant)
    private readonly profileGrantRepository: Repository<ProfileGrant>,
    @InjectRepository(UserEcdhKey)
    private readonly userEcdhKeyRepository: Repository<UserEcdhKey>,
    @InjectRepository(GroupFollowApproval)
    private readonly groupFollowApprovalRepository: Repository<GroupFollowApproval>
  ) {}

  getFolloweesHandler: AppHandlerFunction<
    { after: string; limit: string; user_id: string },
    PaginatedResponse<FolloweeResponse>
  > = async (req) => {
    const user_id = req.user_id;
    const { data, limit, after, total, next } =
      await UserPaginationWrapper<GroupFollowApproval>(
        this.groupFollowApprovalRepository
          .createQueryBuilder()
          .where("user_id = :user_id", { user_id }),
        req.limit,
        req.after
      );
    const followee_ids = data.map((a) => a.followee_id);
    const [followees, userProfileWithGrants] = await Promise.all([
      followee_ids.length == 0
        ? []
        : this.userRepository
            .createQueryBuilder()
            .where("id in (:...user_ids)", { user_ids: followee_ids })
            .getMany(),
      this.profileGrantService.fetchProfilesWithGrants(user_id, followee_ids),
    ]);
    const response: Array<FolloweeResponse> = [];
    data.forEach((follow) => {
      const followee = followees.find((a) => a.id == follow.followee_id);
      if (followee != null) {
        const userProfileWithGrant = userProfileWithGrants.find(
          (a) => a.user_id == follow.followee_id
        );
        const row: FolloweeResponse = {
          user_id: follow.followee_id,
          follow_id: follow.id,
          username: followee.username,
          is_approved: follow.is_approved,
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
