import postgres from "../../db/postgres";
import { getRsaKeys } from "../../service/KeyService";
import { FollowPostgres } from "../../interfaces/database";
import { fetchGroups } from "../../service/GroupService";
import { fetchUsers } from "../../service/UserService";
import { UserPaginationWrapper } from "../../service/helper";
import { fetchProfiles } from "../../service/UserProfileService";
import { AppHandlerFunction } from "../expressHelper";
import { addProfileInfoToRow } from "./helper";
import { PaginatedResponse } from "../../interfaces/responses/PaginatedResponse";

export interface FollowerResponse {
  user_id: string;
  follow_id: string;
  username: string;
  group_id: string;
  group_name: string;
  group_is_default: boolean;
  is_following: boolean;
  is_following_approved: boolean;
  public_key: string | null;
  sym_key: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}

export const GetFollowersHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<FollowerResponse>
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
    { followee_id: user_id, is_approved: true },
    req.limit,
    req.after
  );
  const group_ids = data.map((a) => a.group_id);
  const follower_ids = data.map((a) => a.user_id);
  const [groups, followers, userProfiles, isFollowings] = await Promise.all([
    fetchGroups(group_ids),
    fetchUsers(follower_ids),
    fetchProfiles(follower_ids),
    postgres<FollowPostgres>("group_follow_approvals")
      .whereIn("followee_id", follower_ids)
      .andWhere({ user_id: user_id }),
  ]);
  const user_rsa_key_ids = followers.map((a) => a.rsa_key_id);
  const rsaKeys = await getRsaKeys(user_rsa_key_ids, false);
  const response: Array<FollowerResponse> = [];
  data.forEach((follow) => {
    const group = groups.find((a) => a.id == follow.group_id);
    const follower = followers.find((a) => a.id == follow.user_id);
    const isFollowing = isFollowings.find(
      (a) => a.followee_id == follow.user_id
    );
    const rsaKey = rsaKeys.find((a) => a.id == follower.rsa_key_id);
    let public_key: string | null;
    if (rsaKey != null) {
      public_key = rsaKey.public_key;
    }
    if (group != null && follower != null) {
      const profile = userProfiles.find((a) => a.user_id == follow.user_id);
      let row: FollowerResponse = {
        user_id: follow.user_id,
        follow_id: follow.id,
        username: follower.username,
        group_id: group.id,
        group_name: group.name,
        group_is_default: group.is_default,
        is_following: isFollowing != null,
        is_following_approved: isFollowing != null && isFollowing.is_approved,
        sym_key: follow.user_sym_key,
        public_key: public_key,
      };
      row = addProfileInfoToRow(row, profile);
      response.push(row);
    }
  });
  return {
    response: { data: response, limit, after, total, next },
    error: null,
  };
};
