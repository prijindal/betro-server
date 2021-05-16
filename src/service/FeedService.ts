import postgres from "../db/postgres";
import redis from "../db/redis";
import {
  FollowPostgres,
  GroupPostgres,
  PostLikePostgres,
  PostPostges,
} from "../interfaces/database";
import { fetchUsers } from "../service/UserService";
import { fetchProfiles } from "../service/UserProfileService";
import { fetchPostsLikes } from "./LikesService";
import { fetchProfileGrants } from "./ProfileGrantService";

export interface PostResponse {
  id: string;
  user_id: string;
  media_content: string;
  media_encoding: string;
  text_content: string;
  key_id: string;
  likes: number;
  is_liked: boolean;
  created_at: Date;
}

export interface PostUserResponse {
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  public_key?: string | null;
  own_key_id?: string | null;
  encrypted_profile_sym_key?: string | null;
}

export interface FeedPageInfo {
  updating: boolean;
  next: boolean;
  limit: number;
  total: number;
  after: string;
}

export interface PostsFeedResponse {
  posts: Array<PostResponse>;
  users: { [user_id: string]: PostUserResponse };
  keys: { [key_id: string]: string };
}

export const postProcessPosts = async (
  own_id: string,
  posts: PostPostges[],
  loaded_follows?: Array<FollowPostgres>
): Promise<PostsFeedResponse> => {
  const posts_users: { [user_id: string]: PostUserResponse } = {};
  const keys: { [key_id: string]: string } = {};
  const group_ids = posts.map((a) => a.group_id);
  const user_ids = posts.map((a) => a.user_id);
  const fetchFollows = async () => {
    if (loaded_follows == null || loaded_follows.length == 0) {
      return await postgres<FollowPostgres>("group_follow_approvals")
        .whereIn("group_id", group_ids)
        .andWhere({ user_id: own_id });
    }
    return loaded_follows;
  };
  const [users, profiles, follows] = await Promise.all([
    fetchUsers(user_ids),
    fetchProfiles(user_ids),
    fetchFollows(),
  ]);
  const post_ids = posts.map((a) => a.id);
  const isLikeds = await postgres<PostLikePostgres>("post_likes")
    .where({ user_id: own_id })
    .whereIn("post_id", post_ids)
    .select("id", "post_id");
  const posts_likes = await fetchPostsLikes(post_ids);
  const postResource: Array<PostResponse> = [];
  const { ownGrants, userGrants } = await fetchProfileGrants(own_id, user_ids);
  posts.forEach((post) => {
    const follow = follows.find((a) => a.group_id == post.group_id);
    if (follow != null) {
      keys[post.key_id] = follow.encrypted_sym_key;
    }
    const user = users.find((a) => a.id == post.user_id);
    const profile = profiles.find((a) => a.user_id == post.user_id);
    if (user != null) {
      const userResponse: PostUserResponse = { username: user.username };
      const userGrant = userGrants.find((a) => a.user_id == post.user_id);
      if (userGrant != null) {
        userResponse.encrypted_profile_sym_key = userGrant.encrypted_sym_key;
        userResponse.public_key = userGrant.user_key.public_key;
      }
      const ownGrant = ownGrants.find((a) => a.grantee_id == post.user_id);
      if (ownGrant != null) {
        userResponse.own_key_id = ownGrant.user_key_id;
      }
      if (profile != null) {
        userResponse.first_name = profile.first_name;
        userResponse.last_name = profile.last_name;
        userResponse.profile_picture = profile.profile_picture;
        if (follow != null) {
          // userResponse.sym_key = follow.followee_sym_key;
        }
      }
      posts_users[user.id] = userResponse;
    }
    const isLiked = isLikeds.find((a) => a.post_id == post.id);
    const post_likes = posts_likes.find((a) => a.post_id == post.id);
    postResource.push({
      id: post.id,
      user_id: post.user_id,
      likes: post_likes.likes,
      media_content: post.media_content,
      media_encoding: post.media_encoding,
      text_content: post.text_content,
      key_id: post.key_id,
      created_at: post.created_at,
      is_liked: isLiked != null,
    });
  });
  const feed: PostsFeedResponse = {
    posts: postResource,
    keys,
    users: posts_users,
  };
  return feed;
};

export const isUpdatingUserFeed = async (own_id: string): Promise<boolean> => {
  const updating_key = `${own_id}-feed-updating`;
  const updatingValue = await redis.get(updating_key);
  return updatingValue === "1";
};

export const createUserFeed = async (own_id: string): Promise<void> => {
  const redis_key = `${own_id}-feed`;
  const updating_key = `${own_id}-feed-updating`;
  const updating = await isUpdatingUserFeed(own_id);
  if (updating) {
    return;
  }
  await redis.set(updating_key, "1");
  postgres<FollowPostgres>("group_follow_approvals")
    .innerJoin<GroupPostgres>(
      "group_policies",
      "group_policies.id",
      "=",
      "group_follow_approvals.group_id"
    )
    .innerJoin<PostPostges>("posts", "posts.group_id", "=", "group_policies.id")
    .where("group_follow_approvals.user_id", own_id)
    .andWhere("group_follow_approvals.is_approved", true)
    .select("posts.id", "posts.created_at")
    .then((posts) => {
      posts.forEach((post) => {
        redis.zaddBuffer(
          redis_key,
          post.created_at.getTime(),
          Buffer.from(post.id, "utf-8")
        );
      });
      redis.del(updating_key);
    });
};
