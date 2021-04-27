import postgres from "../db/postgres";
import { fetchUsers } from "../service/UserService";
import {
  PostUserResponse,
  PostsFeedResponse,
  PostPostges,
  FollowPostgres,
} from "../interfaces";
import { fetchProfiles } from "./UserProfileService";

export const postProcessPosts = async (
  own_id: string,
  posts: PostPostges[],
  follows?: Array<FollowPostgres>
): Promise<PostsFeedResponse> => {
  const posts_users: { [user_id: string]: PostUserResponse } = {};
  const keys: { [key_id: string]: string } = {};
  const group_ids = posts.map((a) => a.group_id);
  const user_ids = posts.map((a) => a.user_id);
  const users = await fetchUsers(user_ids);
  const profiles = await fetchProfiles(user_ids);
  if (follows == null || follows.length == 0) {
    follows = await postgres<FollowPostgres>("group_follow_approvals")
      .whereIn("group_id", group_ids)
      .andWhere({ user_id: own_id });
  }
  posts.forEach((post) => {
    const follow = follows.find((a) => a.group_id == post.group_id);
    if (follow != null) {
      keys[post.key_id] = follow.group_sym_key;
    }
    const user = users.find((a) => a.id == post.user_id);
    const profile = profiles.find((a) => a.user_id == post.user_id);
    if (user != null) {
      const userResponse: PostUserResponse = { username: user.username };
      if (profile != null) {
        userResponse.first_name = profile.first_name;
        userResponse.last_name = profile.last_name;
        userResponse.profile_picture = profile.profile_picture;
        if (follow != null) {
          userResponse.sym_key = follow.followee_sym_key;
        }
      }
      posts_users[user.id] = userResponse;
    }
  });
  const feed: PostsFeedResponse = {
    posts: posts.map((post) => ({
      id: post.id,
      user_id: post.user_id,
      media_content: post.media_content,
      media_encoding: post.media_encoding,
      text_content: post.text_content,
      key_id: post.key_id,
      created_at: post.created_at,
    })),
    keys,
    users: posts_users,
  };
  return feed;
};
