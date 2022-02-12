import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { User, GroupFollowApproval, UserSettings } from "../entities";
import { AppHandlerFunction } from "./expressHelper";
import { ProfileGrantService } from "../service/ProfileGrantService";
import {
  UserInfoResponse,
  SearchResult,
} from "../interfaces/responses/UserResponses";

@Service()
export class UserController {
  constructor(
    private profileGrantService: ProfileGrantService,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GroupFollowApproval)
    private readonly groupFollowApprovalRepository: Repository<GroupFollowApproval>,
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>
  ) {}

  userProfileHandler: AppHandlerFunction<
    { username: string; user_id: string },
    UserInfoResponse
  > = async (req) => {
    const own_id = req.user_id;
    const username = req.username;
    const user = await this.userRepository.findOne({ username });
    if (user == null) {
      return {
        error: {
          status: 404,
          message: "User not fond",
          data: null,
        },
        response: null,
      };
    } else {
      const isFollowing = await this.groupFollowApprovalRepository.findOne(
        { user_id: own_id, followee_id: user.id },
        { select: ["id", "is_approved"] }
      );
      const userProfileWithGrants =
        await this.profileGrantService.fetchProfilesWithGrants(own_id, [
          user.id,
        ]);
      const response: UserInfoResponse = {
        id: user.id,
        username: user.username,
        is_following: isFollowing != null,
        is_approved: isFollowing != null && isFollowing.is_approved,
        ...this.profileGrantService.addProfileGrantToRow(
          userProfileWithGrants.length > 0 ? userProfileWithGrants[0] : null
        ),
      };
      return {
        response,
        error: null,
      };
    }
  };

  searchUserHandler: AppHandlerFunction<
    { query: string; user_id: string },
    Array<{ id: string; username: string }>
  > = async (req) => {
    const user_id = req.user_id;
    const query = req.query;
    const users = await this.userRepository
      .createQueryBuilder("users")
      .leftJoin(
        "user_settings",
        "user_settings",
        "user_settings.user_id = users.id :: text"
      )
      .where("user_settings.type = :type", { type: "allow_search" })
      .andWhere("user_settings.enabled = :enabled", { enabled: true })
      .andWhere("users.username LIKE :query", { query: `%${query}%` })
      .select(["users.id", "users.username"])
      .getMany();
    const user_ids = users.map((a) => a.id);
    const [userProfileWithGrants, isFollowings] = await Promise.all([
      this.profileGrantService.fetchProfilesWithGrants(user_id, user_ids),
      user_ids.length === 0
        ? []
        : this.groupFollowApprovalRepository
            .createQueryBuilder()
            .where("followee_id in (:...user_ids)", { user_ids })
            .andWhere("user_id = :user_id", { user_id })
            .getMany(),
    ]);
    const response: Array<SearchResult> = [];
    users.forEach((user) => {
      const isFollowing = isFollowings.find((a) => a.followee_id == user.id);
      const userProfileGrant = userProfileWithGrants.find(
        (a) => a.user_id == user.id
      );
      const row: SearchResult = {
        id: user.id,
        username: user.username,
        is_following: isFollowing != null,
        is_following_approved: isFollowing != null && isFollowing.is_approved,
        ...this.profileGrantService.addProfileGrantToRow(userProfileGrant),
      };
      response.push(row);
    });
    return {
      response: response,
      error: null,
    };
  };
}
