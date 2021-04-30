import postgres from "../db/postgres";
import redis from "../db/redis";
import {
  FollowPostgres,
  GroupPostgres,
  PostPostges,
} from "../interfaces/database";
import { base64ToDate, limitToInt, dateToBase64 } from "../service/helper";
import { AppHandlerFunction } from "./expressHelper";
import { fetchUserPosts } from "../service/PostService";
import { fetchUserGroups } from "../service/GroupService";
import { getSymKeys } from "../service/KeyService";
import { checkFollow } from "../service/FollowService";
import { fetchUserByUsername, fetchUsers } from "../service/UserService";
import { fetchProfiles } from "../service/UserProfileService";

export interface PostResponse {
  id: string;
  user_id: string;
  media_content: string;
  media_encoding: string;
  text_content: string;
  key_id: string;
  created_at: Date;
}

export interface PostUserResponse {
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  sym_key?: string;
}

export interface PostsFeedResponse {
  posts: Array<PostResponse>;
  users: { [user_id: string]: PostUserResponse };
  keys: { [key_id: string]: string };
}

const postProcessPosts = async (
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

const createUserFeed = async (own_id: string): Promise<void> => {
  const redis_key = `${own_id}-feed`;
  const updating_key = `${own_id}-feed-updating`;
  const updating = (await redis.get(updating_key)) === "1";
  if (updating) {
    return;
  }
  redis.set(updating_key, "1");
  const posts = await postgres<FollowPostgres>("group_follow_approvals")
    .innerJoin<GroupPostgres>(
      "group_policies",
      "group_policies.id",
      "=",
      "group_follow_approvals.group_id"
    )
    .innerJoin<PostPostges>("posts", "posts.group_id", "=", "group_policies.id")
    .where("group_follow_approvals.user_id", own_id)
    .andWhere("group_follow_approvals.is_approved", true)
    .select("posts.id", "posts.created_at");
  posts.forEach((post) => {
    redis.zaddBuffer(
      redis_key,
      post.created_at.getTime(),
      Buffer.from(post.id, "utf-8")
    );
  });
  redis.del(updating_key);
};

export const GetHomeFeedHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PostsFeedResponse
> = async (req) => {
  const own_id = req.user_id;
  const after = base64ToDate(req.after) || new Date();
  const limit = limitToInt(req.limit, 10);
  const redis_key = `${own_id}-feed`;
  const exists = await redis.exists(redis_key);
  if (!exists) {
    createUserFeed(own_id);
  }
  const total = await redis.zcount(redis_key, "-inf", "+inf");
  const post_ids = await redis.zrevrangebyscore(
    redis_key,
    `(${after.getTime()}`,
    "-inf",
    "LIMIT",
    0,
    limit
  );
  const posts = await postgres<PostPostges>("posts")
    .whereIn("id", post_ids)
    .orderBy("created_at", "desc");
  // `ZRANGE "4b971f68-6be2-405f-94d9-2e363713d885-feed" -inf (1619775715412 BYSCORE LIMIT 0 20`;
  const response = await postProcessPosts(own_id, posts);
  let afterCursor = null;
  if (response.posts.length > 0) {
    afterCursor = response.posts[response.posts.length - 1].created_at;
  }
  let totalLeft = 0;
  if (afterCursor != null) {
    totalLeft = await redis.zcount(
      redis_key,
      "-inf",
      `(${afterCursor.getTime()}`
    );
  }
  const pageInfo = {
    after: afterCursor != null ? dateToBase64(afterCursor) : null,
    limit,
    next: totalLeft > 0,
    total,
  };
  return {
    response: {
      ...response,
      pageInfo,
    },
    error: null,
  };
};

export const FetchOwnPostsHandler: AppHandlerFunction<
  { user_id: string },
  PostsFeedResponse
> = async (req) => {
  const own_id = req.user_id;
  const postsResponse = await fetchUserPosts(own_id);
  const groups = await fetchUserGroups(own_id);
  const keys = await getSymKeys(groups.map((a) => a.key_id));
  const posts: Array<PostResponse> = [];
  for (const post of postsResponse) {
    posts.push({
      id: post.id,
      user_id: post.user_id,
      media_content: post.media_content,
      media_encoding: post.media_encoding,
      text_content: post.text_content,
      key_id: post.key_id,
      created_at: post.created_at,
    });
  }
  const feed: PostsFeedResponse = {
    posts,
    keys,
    users: {},
  };
  return {
    response: feed,
    error: null,
  };
};

export const GetUserPostsHandler: AppHandlerFunction<
  { username: string; user_id: string },
  PostsFeedResponse
> = async (req) => {
  const own_id = req.user_id;
  const username = req.username;
  const user = await fetchUserByUsername(username);
  if (user == null) {
    return {
      error: {
        status: 404,
        message: "User not found",
        data: null,
      },
      response: null,
    };
  } else {
    const isFollowing = await checkFollow(own_id, user.id);
    if ((isFollowing && isFollowing.is_approved) || own_id == user.id) {
      const posts = await fetchUserPosts(user.id);
      const resp = await postProcessPosts(own_id, posts);
      return {
        response: resp,
        error: null,
      };
    } else {
      return {
        error: {
          status: 403,
          message: "Not following",
          data: null,
        },
        response: null,
      };
    }
  }
};
