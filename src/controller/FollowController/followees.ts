import { FollowPostgres } from "../../interfaces/database";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { AppHandlerFunction } from "../expressHelper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import {
  addProfileGrantToRow,
  fetchProfilesWithGrants,
} from "../../service/ProfileGrantService";
import { FolloweeResponse } from "../../interfaces/responses/UserResponses";

export const GetFolloweesHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<FolloweeResponse>
> = async (req) => {
  const user_id = req.user_id;
  const { data, limit, after, total, next } =
    await UserPaginationWrapper<FollowPostgres>(
      "group_follow_approvals",
      { user_id },
      req.limit,
      req.after
    );
  const followee_ids = data.map((a) => a.followee_id);
  const [followees, userProfileWithGrants] = await Promise.all([
    fetchUsers(followee_ids),
    fetchProfilesWithGrants(user_id, followee_ids),
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
