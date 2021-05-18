import postgres from "../../db/postgres";
import { FollowPostgres } from "../../interfaces/database";
import { fetchGroups } from "../../service/GroupService";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { AppHandlerFunction } from "../expressHelper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import {
  addProfileGrantToRow,
  fetchProfilesWithGrants,
} from "../../service/ProfileGrantService";
import { FollowerResponse } from "../../interfaces/responses/UserResponses";

export const GetFollowersHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<FollowerResponse>
> = async (req) => {
  const user_id = req.user_id;
  const { data, limit, after, total, next } =
    await UserPaginationWrapper<FollowPostgres>(
      "group_follow_approvals",
      { followee_id: user_id, is_approved: true },
      req.limit,
      req.after
    );
  const group_ids = data.map((a) => a.group_id);
  const follower_ids = data.map((a) => a.user_id);
  const [groups, followers, isFollowings, userProfileWithGrants] =
    await Promise.all([
      fetchGroups(group_ids),
      fetchUsers(follower_ids),
      postgres<FollowPostgres>("group_follow_approvals")
        .whereIn("followee_id", follower_ids)
        .andWhere({ user_id: user_id }),
      fetchProfilesWithGrants(user_id, follower_ids),
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
        ...addProfileGrantToRow(userProfileWithGrant),
      };
      response.push(row);
    }
  });
  return {
    response: { data: response, limit, after, total, next },
    error: null,
  };
};
