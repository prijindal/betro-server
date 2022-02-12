import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { UserPaginationWrapper } from "../../service/helper";
import { AppHandlerFunction } from "../expressHelper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import { ApprovalResponse } from "../../interfaces/responses/UserResponses";
import {
  GroupFollowApproval,
  User,
  UserEcdhKey,
  ProfileGrant,
} from "../../entities";
import { ProfileGrantService } from "../../service/ProfileGrantService";

@Service()
export class ApprovalsController {
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

  getApprovalsHandler: AppHandlerFunction<
    { after: string; limit: string; user_id: string },
    PaginatedResponse<ApprovalResponse>
  > = async (req) => {
    const user_id = req.user_id;
    const { data, limit, after, total, next } =
      await UserPaginationWrapper<GroupFollowApproval>(
        this.groupFollowApprovalRepository
          .createQueryBuilder()
          .where("followee_id = :user_id and is_approved = false", { user_id }),
        req.limit,
        req.after
      );
    const user_ids = data.map((a) => a.user_id);
    const [users, userProfileWithGrants] = await Promise.all([
      user_ids.length == 0
        ? []
        : this.userRepository
            .createQueryBuilder()
            .where("id in (:...user_ids)", { user_ids })
            .getMany(),
      this.profileGrantService.fetchProfilesWithGrants(user_id, user_ids),
    ]);
    const ownGrants =
      user_ids.length === 0
        ? []
        : await this.profileGrantRepository
            .createQueryBuilder()
            .where("grantee_id in (:...user_ids)", { user_ids })
            .andWhere("user_id = :user_id", { user_id })
            .getMany();
    const ownIds = [
      ...ownGrants.map((a) => a.grantee_key_id),
      ...ownGrants.map((a) => a.user_key_id),
    ];
    const ownKeys =
      ownIds.length === 0
        ? []
        : await this.userEcdhKeyRepository
            .createQueryBuilder()
            .where("id in (:...user_ids)", {
              user_ids: ownIds,
            })
            .getMany();
    const response: Array<ApprovalResponse> = [];
    data.forEach((approval) => {
      const user = users.find((a) => a.id == approval.user_id);
      if (user != null) {
        const userProfileWithGrant = userProfileWithGrants.find(
          (a) => a.user_id == user.id
        );
        const ownGrant = ownGrants.find((a) => a.grantee_id == user.id);
        const ownKey = ownKeys.find((a) => a.id == ownGrant.user_key_id);
        const userKey = ownKeys.find((a) => a.id == ownGrant.grantee_key_id);
        const row: ApprovalResponse = {
          id: approval.id,
          username: user.username,
          follower_id: approval.user_id,
          created_at: approval.created_at,
          ...this.profileGrantService.addProfileGrantToRow(
            userProfileWithGrant
          ),
          own_key_id: ownGrant.user_key_id,
          public_key: userKey.public_key,
          own_private_key: ownKey.private_key,
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
