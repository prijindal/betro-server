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
import postgres from "../../db/postgres";

export interface FolloweeResponse {
  user_id: string;
  follow_id: string;
  username: string;
  is_approved: boolean;
  public_key?: string | null;
  encrypted_profile_sym_key?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}

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
  const [followees, profiles] = await Promise.all([
    fetchUsers(followee_ids),
    fetchProfiles(followee_ids),
  ]);
  const profileGrants = await postgres<ProfileGrantPostgres>("profile_grants")
    .whereIn("user_id", followee_ids)
    .where("grantee_id", user_id)
    .select();
  const followeeKeys = await postgres<EcdhKeyPostgres>(
    "user_echd_keys"
  ).whereIn(
    "id",
    profileGrants.map((a) => a.user_key_id)
  );
  const response: Array<FolloweeResponse> = [];
  data.forEach((follow) => {
    const followee = followees.find((a) => a.id == follow.followee_id);
    const profile = profiles.find((a) => a.user_id == follow.followee_id);
    if (followee != null) {
      let row: FolloweeResponse = {
        user_id: follow.followee_id,
        follow_id: follow.id,
        username: followee.username,
        is_approved: follow.is_approved,
      };
      const profileGrant = profileGrants.find(
        (a) => a.user_id == follow.user_id
      );
      if (profileGrant != null) {
        row.encrypted_profile_sym_key = profileGrant.encrypted_sym_key;
        const followeeKey = followeeKeys.find(
          (a) => a.id == profileGrant.user_key_id
        );
        if (followeeKey != null) {
          row.public_key = followeeKey.public_key;
        }
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
