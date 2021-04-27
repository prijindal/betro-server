import postgres from "../db/postgres";
import {
  FollowPostgres,
  GroupPostgres,
  PostPostges,
} from "../interfaces/database";
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

export const GetHomeFeedHandler: AppHandlerFunction<
  { user_id: string },
  PostsFeedResponse
> = async (req) => {
  const own_id = req.user_id;
  const posts: Array<{
    followee_sym_key: string;
    group_sym_key: string;
    media_encoding: string;
    media_content: string;
    text_content: string;
    id: string;
    created_at: Date;
    key_id: string;
    user_id: string;
    group_id: string;
  }> = await postgres<FollowPostgres>("group_follow_approvals")
    .innerJoin<GroupPostgres>(
      "group_policies",
      "group_policies.id",
      "=",
      "group_follow_approvals.group_id"
    )
    .innerJoin<PostPostges>("posts", "posts.group_id", "=", "group_policies.id")
    .where("group_follow_approvals.user_id", own_id)
    .andWhere("group_follow_approvals.is_approved", true)
    .select(
      "followee_sym_key",
      "group_sym_key",
      "followee_id",
      "media_encoding",
      "media_content",
      "text_content",
      "posts.id",
      "posts.created_at",
      "posts.key_id",
      "posts.user_id",
      "posts.group_id"
    );
  const response = await postProcessPosts(own_id, posts);
  return {
    response,
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
