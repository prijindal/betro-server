import { FollowPostgres } from "../../interfaces/database";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { fetchProfiles } from "../../service/UserProfileService";
import { AppHandlerFunction } from "../expressHelper";
import { addProfileInfoToRow } from "./helper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import { fetchProfileGrants } from "../../service/ProfileGrantService";

export interface ApprovalResponse {
  id: string;
  follower_id: string;
  username: string;
  created_at: Date;
  follower_key_id: string;
  follower_public_key: string;
  own_key_id?: string | null;
  own_private_key?: string | null;
  follower_encrypted_profile_sym_key?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}

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
  const [users, profiles] = await Promise.all([
    fetchUsers(user_ids),
    fetchProfiles(user_ids),
  ]);
  const { ownGrants, userGrants } = await fetchProfileGrants(user_id, user_ids);
  const response: Array<ApprovalResponse> = [];
  data.forEach((approval) => {
    const user = users.find((a) => a.id == approval.user_id);
    if (user != null) {
      const profile = profiles.find((a) => a.user_id == user.id);
      const userGrant = userGrants.find((a) => a.user_id == user.id);
      let row: ApprovalResponse = {
        id: approval.id,
        username: user.username,
        follower_id: approval.user_id,
        created_at: approval.created_at,
        follower_key_id: userGrant.user_key_id,
        follower_public_key: userGrant.user_key.public_key,
      };
      const ownGrant = ownGrants.find((a) => a.user_id == approval.followee_id);
      if (ownGrant != null) {
        row.own_key_id = ownGrant.user_key_id;
        row.own_private_key = ownGrant.user_key.private_key;
      }
      if (userGrant != null) {
        row.follower_encrypted_profile_sym_key = userGrant.encrypted_sym_key;
      }
      row = addProfileInfoToRow(row, profile);
      response.push(row);
    }
  });
  return {
    response: { data: response, limit, after, total, next },
    error: null,
  };
};
