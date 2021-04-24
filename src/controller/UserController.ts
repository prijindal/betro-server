import { Request, Response } from "express";
import { fetchUserPosts } from "../service/PostService";
import { checkFollow } from "../service/FollowService";
import { fetchUserByUsername } from "../service/UserService";
import { errorResponse } from "../util/responseHandler";
import { PostsFeedResponse } from "../interfaces/responses/PostResponse";
import { ErrorDataType } from "../constant/ErrorData";
import { postProcessPosts } from "../service/FeedService";
import postgres from "../db/postgres";
import { RsaKeyPostgres } from "../interfaces/database/RsaKeyPostgres";
import { UserInfoResponse } from "../interfaces/responses/UserInfoResponse";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";
import { fetchProfile } from "../service/UserProfileService";

export const userProfile = async (
  req: Request<{ username: string }>,
  res: Response<UserInfoResponse | ErrorDataType>
): Promise<void> => {
  const own_id = res.locals.user_id;
  const username = req.params.username;
  try {
    const user = await fetchUserByUsername(username);
    if (user == null) {
      res.status(404).send(errorResponse(404, "User not found"));
    } else {
      const isFollowing = await postgres<FollowPostgres>(
        "group_follow_approvals"
      )
        .select("id", "is_approved", "followee_sym_key")
        .where({ user_id: own_id, followee_id: user.id })
        .first();
      let public_key: string | null = null;
      if (isFollowing == null) {
        const userRsaKey = await postgres<RsaKeyPostgres>("user_rsa_keys")
          .select("public_key")
          .where("id", user.key_id)
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
      res.status(200).send(response);
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const userPosts = async (
  req: Request,
  res: Response<PostsFeedResponse | ErrorDataType>
): Promise<void> => {
  const own_id = res.locals.user_id;
  const username = req.params.username;
  try {
    const user = await fetchUserByUsername(username);
    if (user == null) {
      res.status(404).send(errorResponse(404, "User not found"));
    } else {
      const isFollowing = await checkFollow(own_id, user.id);
      if ((isFollowing && isFollowing.is_approved) || own_id == user.id) {
        const posts = await fetchUserPosts(user.id);
        const resp = await postProcessPosts(own_id, posts);
        res.status(200).send(resp);
      } else {
        res.status(403).send(errorResponse(403, "Not following"));
      }
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
