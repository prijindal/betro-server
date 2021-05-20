import {
  EcdhKeyPostgres,
  FollowPostgres,
  ProfileGrantPostgres,
} from "../../interfaces/database";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { AppHandlerFunction } from "../expressHelper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import { ApprovalResponse } from "../../interfaces/responses/UserResponses";
import {
  addProfileGrantToRow,
  fetchProfilesWithGrants,
} from "../../service/ProfileGrantService";
import postgres from "../../db/postgres";

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
  const ownGrants = await postgres<ProfileGrantPostgres>("profile_grants")
    .whereIn("grantee_id", user_ids)
    .where("user_id", user_id);
  const ownKeys = await postgres<EcdhKeyPostgres>("user_echd_keys").whereIn(
    "id",
    [
      ...ownGrants.map((a) => a.grantee_key_id),
      ...ownGrants.map((a) => a.user_key_id),
    ]
  );
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
        ...addProfileGrantToRow(userProfileWithGrant),
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
