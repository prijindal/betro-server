import { fetchUserGroupsFollows } from "../service/FollowService";
import { fetchUsers } from "../service/UserService";
import {
  PostUserResponse,
  PostsFeedResponse,
} from "../interfaces/responses/PostResponse";
import { PostPostges } from "src/interfaces/database/PostPostgres";

export const postProcessPosts = async (
  own_id: string,
  posts: PostPostges[]
): Promise<PostsFeedResponse> => {
  const posts_users: { [user_id: string]: PostUserResponse } = {};
  const keys: { [key_id: string]: string } = {};
  const group_ids = posts.map((a) => a.group_id);
  const user_ids = posts.map((a) => a.user_id);
  const users = await fetchUsers(user_ids);
  const follows = await fetchUserGroupsFollows(own_id, group_ids);
  posts.forEach((post) => {
    const follow = follows.find((a) => a.group_id == post.group_id);
    if (follow != null) {
      keys[post.key_id] = follow.sym_key;
    }
    const user = users.find((a) => a.id == post.user_id);
    if (user != null) {
      posts_users[user.id] = {
        email: user.email,
      };
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
    })),
    keys,
    users: posts_users,
  };
  return feed;
};
