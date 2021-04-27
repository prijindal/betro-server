import { fetchUserByUsername } from "../service/UserService";
import { RsaKeyPostgres, FollowPostgres } from "../interfaces/database";
import postgres from "../db/postgres";
import { fetchProfile } from "../service/UserProfileService";
import { AppHandlerFunction } from "./expressHelper";

export interface UserInfoResponse {
  id: string;
  username: string;
  is_following: boolean;
  is_approved: boolean;
  public_key: string | null;
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
      .select("id", "is_approved", "followee_sym_key")
      .where({ user_id: own_id, followee_id: user.id })
      .first();
    let public_key: string | null = null;
    if (isFollowing == null) {
      const userRsaKey = await postgres<RsaKeyPostgres>("user_rsa_keys")
        .select("public_key")
        .where("id", user.rsa_key_id)
        .first();
      public_key = userRsaKey.public_key;
    }
    const response: UserInfoResponse = {
      id: user.id,
      username: user.username,
      is_following: isFollowing != null,
      is_approved: isFollowing != null && isFollowing.is_approved,
      sym_key: isFollowing != null ? isFollowing.followee_sym_key : null,
      public_key: public_key,
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
