import { fetchUserByUsername } from "../service/UserService";
import {
  FollowPostgres,
  UserPostgres,
  UserSettingPostgres,
  ProfileGrantPostgres,
} from "../interfaces/database";
import postgres from "../db/postgres";
import { fetchProfile, fetchProfiles } from "../service/UserProfileService";
import { AppHandlerFunction } from "./expressHelper";
import { addProfileInfoToRow } from "./FollowController/helper";

export interface UserInfoResponse {
  id: string;
  username: string;
  is_following: boolean;
  is_approved: boolean;
  sym_key: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}

export const UserProfileHandler: AppHandlerFunction<
  { username: string; user_id: string },
  UserInfoResponse
> = async (req) => {
  const own_id = req.user_id;
  const username = req.username;
  const user = await fetchUserByUsername(username);
  if (user == null) {
    return {
      error: {
        status: 404,
        message: "User not fond",
        data: null,
      },
      response: null,
    };
  } else {
    const isFollowing = await postgres<FollowPostgres>("group_follow_approvals")
      .select("id", "is_approved")
      .where({ user_id: own_id, followee_id: user.id })
      .first();
    const followeeProfileGrant = await postgres<ProfileGrantPostgres>(
      "profile_grants"
    )
      .where({ user_id: user.id, grantee_id: own_id, granted: true })
      .select("encrypted_sym_key")
      .first();
    const response: UserInfoResponse = {
      id: user.id,
      username: user.username,
      is_following: isFollowing != null,
      is_approved: isFollowing != null && isFollowing.is_approved,
      sym_key:
        followeeProfileGrant != null
          ? followeeProfileGrant.encrypted_sym_key
          : null,
    };
    const profile = await fetchProfile(user.id);
    if (profile != null) {
      response.first_name = profile.first_name;
      response.last_name = profile.last_name;
      response.profile_picture = profile.profile_picture;
    }
    return {
      response,
      error: null,
    };
  }
};

export interface SearchResult {
  id: string;
  username: string;
  is_following: boolean;
  is_following_approved: boolean;
  sym_key: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}

export const SearchUserHandler: AppHandlerFunction<
  { query: string; user_id: string },
  Array<{ id: string; username: string }>
> = async (req) => {
  const user_id = req.user_id;
  const query = req.query;
  const users = await postgres<UserPostgres>("users")
    .join<UserSettingPostgres>(
      "user_settings",
      "user_settings.user_id",
      "=",
      "users.id"
    )
    .where("user_settings.type", "=", "allow_search")
    .where("user_settings.enabled", "=", true)
    .where("users.username", "LIKE", `%${query}%`)
    .select("users.id", "users.username");
  const user_ids = users.map((a) => a.id);
  const [userProfiles, isFollowings] = await Promise.all([
    fetchProfiles(user_ids),
    postgres<FollowPostgres>("group_follow_approvals")
      .whereIn("followee_id", user_ids)
      .andWhere({ user_id: user_id }),
  ]);

  const followeeProfileGrants = await postgres<ProfileGrantPostgres>(
    "profile_grants"
  )
    .where({ grantee_id: user_id, granted: true })
    .whereIn("user_id", user_ids)
    .select("encrypted_sym_key", "id", "user_id");
  const response: Array<SearchResult> = [];
  users.forEach((user) => {
    const isFollowing = isFollowings.find((a) => a.followee_id == user.id);
    const followeeProfileGrant = followeeProfileGrants.find(
      (a) => a.user_id == user.id
    );
    const profile = userProfiles.find((a) => a.user_id == user.id);
    let row: SearchResult = {
      id: user.id,
      username: user.username,
      sym_key:
        followeeProfileGrant != null
          ? followeeProfileGrant.encrypted_sym_key
          : null,
      is_following: isFollowing != null,
      is_following_approved: isFollowing != null && isFollowing.is_approved,
    };
    if (isFollowing != null && isFollowing.is_approved) {
      row = addProfileInfoToRow(row, profile);
    }
    response.push(row);
  });
  return {
    response: response,
    error: null,
  };
};
