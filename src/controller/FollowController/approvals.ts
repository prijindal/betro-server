import { FollowPostgres } from "../../interfaces/database";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { AppHandlerFunction } from "../expressHelper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import { ApprovalResponse } from "../../interfaces/responses/UserResponses";
import {
  addProfileGrantToRow,
  fetchProfilesWithGrants,
} from "../../service/ProfileGrantService";

export const GetApprovalsHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<ApprovalResponse>
> = async (req) => {
  const user_id = req.user_id;
  const { data, limit, after, total, next } =
    await UserPaginationWrapper<FollowPostgres>(
      "group_follow_approvals",
      { followee_id: user_id, is_approved: false },
      req.limit,
      req.after
    );
  const user_ids = data.map((a) => a.user_id);
  const [users, userProfileWithGrants] = await Promise.all([
    fetchUsers(user_ids),
    fetchProfilesWithGrants(user_id, user_ids),
  ]);
  const response: Array<ApprovalResponse> = [];
  data.forEach((approval) => {
    const user = users.find((a) => a.id == approval.user_id);
    if (user != null) {
      const userProfileWithGrant = userProfileWithGrants.find(
        (a) => a.user_id == user.id
      );
      const row: ApprovalResponse = {
        id: approval.id,
        username: user.username,
        follower_id: approval.user_id,
        created_at: approval.created_at,
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
