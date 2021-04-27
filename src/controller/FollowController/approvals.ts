import { getRsaKeys } from "../../service/KeyService";
import { FollowPostgres, PaginatedResponse } from "../../interfaces";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { fetchProfiles } from "../../service/UserProfileService";
import { AppHandlerFunction } from "../expressHelper";
import { addProfileInfoToRow } from "./helper";

export interface ApprovalResponse {
  id: string;
  follower_id: string;
  public_key: string;
  sym_key: string;
  username: string;
  created_at: Date;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}

export const GetApprovalsHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<ApprovalResponse>
> = async (req) => {
  const user_id = req.user_id;
  const {
    data,
    limit,
    after,
    total,
    next,
  } = await UserPaginationWrapper<FollowPostgres>(
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
  const rsa_key_ids = users.map((a) => a.rsa_key_id);
  const rsa_keys = await getRsaKeys(rsa_key_ids, false);
  const response: Array<ApprovalResponse> = [];
  data.forEach((approval) => {
    const user = users.find((a) => a.id == approval.user_id);
    if (user != null) {
      const rsa_key = rsa_keys.find((a) => a.id == user.rsa_key_id);
      const profile = profiles.find((a) => a.user_id == user.id);
      if (rsa_key != null) {
        let row: ApprovalResponse = {
          id: approval.id,
          username: user.username,
          follower_id: approval.user_id,
          public_key: rsa_key.public_key,
          created_at: approval.created_at,
          sym_key: approval.user_sym_key,
        };
        row = addProfileInfoToRow(row, profile);
        response.push(row);
      }
    }
  });
  return {
    response: { data: response, limit, after, total, next },
    error: null,
  };
};
