import { FollowPostgres } from "../../interfaces/database";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { fetchProfiles } from "../../service/UserProfileService";
import { AppHandlerFunction } from "../expressHelper";
import { addProfileInfoToRow } from "./helper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";
import { fetchProfileGrants } from "../../service/ProfileGrantService";

export interface FolloweeResponse {
  user_id: string;
  follow_id: string;
  username: string;
  is_approved: boolean;
  public_key?: string | null;
  encrypted_profile_sym_key?: string | null;
  own_key_id?: string | null;
  own_private_key?: string | null;
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
  const { userGrants, ownGrants } = await fetchProfileGrants(
    user_id,
    followee_ids
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
      const userGrant = userGrants.find((a) => a.user_id == follow.followee_id);
      if (userGrant != null) {
        row.encrypted_profile_sym_key = userGrant.encrypted_sym_key;
        row.public_key = userGrant.user_key.public_key;
      }
      const ownGrant = ownGrants.find((a) => a.user_id == follow.user_id);
      if (ownGrant != null) {
        row.own_key_id = ownGrant.user_key_id;
        row.own_private_key = ownGrant.user_key.private_key;
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
