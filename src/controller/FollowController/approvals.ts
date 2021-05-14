import postgres from "../../db/postgres";
import {
  EcdhKeyPostgres,
  FollowPostgres,
  ProfileGrantPostgres,
} from "../../interfaces/database";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { fetchProfiles } from "../../service/UserProfileService";
import { AppHandlerFunction } from "../expressHelper";
import { addProfileInfoToRow } from "./helper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";

export interface ApprovalResponse {
  id: string;
  follower_id: string;
  username: string;
  created_at: Date;
  follower_key_id: string;
  follower_public_key: string;
  own_key_id?: string | null;
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
  const followersProfileKeys = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .whereIn(
      "id",
      data.map((a) => a.user_key_id)
    )
    .select("user_id", "public_key");
  const ownProfileGrants = await postgres<ProfileGrantPostgres>(
    "profile_grants"
  )
    .whereIn(
      "grantee_id",
      data.map((a) => a.user_id)
    )
    .where("user_id", user_id)
    .select("*");
  const followerProfileGrants = await postgres<ProfileGrantPostgres>(
    "profile_grants"
  )
    .whereIn(
      "user_id",
      data.map((a) => a.user_id)
    )
    .where("grantee_id", user_id)
    .select("*");
  const response: Array<ApprovalResponse> = [];
  data.forEach((approval) => {
    const user = users.find((a) => a.id == approval.user_id);
    if (user != null) {
      const profile = profiles.find((a) => a.user_id == user.id);
      const followersProfileKey = followersProfileKeys.find(
        (a) => a.user_id == user.id
      );
      let row: ApprovalResponse = {
        id: approval.id,
        username: user.username,
        follower_id: approval.user_id,
        created_at: approval.created_at,
        follower_key_id: approval.user_key_id,
        follower_public_key: followersProfileKey.public_key,
      };
      const ownProfileGrant = ownProfileGrants.find(
        (a) => a.grantee_id == user.id
      );
      const followerProfileGrant = followerProfileGrants.find(
        (a) => a.user_id == user.id
      );
      if (ownProfileGrant != null) {
        row.own_key_id = ownProfileGrant.user_key_id;
      }
      if (followerProfileGrant != null) {
        row.follower_encrypted_profile_sym_key =
          followerProfileGrant.encrypted_sym_key;
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
