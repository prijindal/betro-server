import { fetchUserByUsername } from "../service/UserService";
import {
  FollowPostgres,
  UserPostgres,
  UserSettingPostgres,
} from "../interfaces/database";
import postgres from "../db/postgres";
import { AppHandlerFunction } from "./expressHelper";
import {
  addProfileGrantToRow,
  fetchProfilesWithGrants,
} from "../service/ProfileGrantService";
import {
  UserInfoResponse,
  SearchResult,
} from "../interfaces/responses/UserResponses";

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
    const userProfileWithGrants = await fetchProfilesWithGrants(own_id, [
      user.id,
    ]);
    const response: UserInfoResponse = {
      id: user.id,
      username: user.username,
      is_following: isFollowing != null,
      is_approved: isFollowing != null && isFollowing.is_approved,
      ...addProfileGrantToRow(
        userProfileWithGrants.length > 0 ? userProfileWithGrants[0] : null
      ),
    };
    return {
      response,
      error: null,
    };
  }
};

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
  const [userProfileWithGrants, isFollowings] = await Promise.all([
    fetchProfilesWithGrants(user_id, user_ids),
    postgres<FollowPostgres>("group_follow_approvals")
      .whereIn("followee_id", user_ids)
      .andWhere({ user_id: user_id }),
  ]);
  const response: Array<SearchResult> = [];
  users.forEach((user) => {
    const isFollowing = isFollowings.find((a) => a.followee_id == user.id);
    const userProfileGrant = userProfileWithGrants.find(
      (a) => a.user_id == user.id
    );
    const row: SearchResult = {
      id: user.id,
      username: user.username,
      is_following: isFollowing != null,
      is_following_approved: isFollowing != null && isFollowing.is_approved,
      ...addProfileGrantToRow(userProfileGrant),
    };
    response.push(row);
  });
  return {
    response: response,
    error: null,
  };
};
