import postgres from "../db/postgres";
import redis from "../db/redis";
import { PostLikePostgres, PostPostges } from "../interfaces/database";
import { base64ToDate, limitToInt, dateToBase64 } from "../service/helper";
import { AppHandlerFunction } from "./expressHelper";
import { fetchUserGroups } from "../service/GroupService";
import { getSymKeys } from "../service/KeyService";
import { checkFollow } from "../service/FollowService";
import { fetchUserByUsername } from "../service/UserService";
import { UserPaginationWrapper } from "../service/helper";
import {
  createUserFeed,
  postProcessPosts,
  PostResponse,
  isUpdatingUserFeed,
  PostsFeedResponse,
  FeedPageInfo,
} from "../service/FeedService";
import { fetchPostsLikes } from "../service/LikesService";

export const GetHomeFeedHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PostsFeedResponse & { pageInfo: FeedPageInfo }
> = async (req) => {
  const own_id = req.user_id;
  const after = base64ToDate(req.after) || new Date();
  const limit = limitToInt(req.limit, 10);
  const redis_key = `${own_id}-feed`;
  const exists = await redis.exists(redis_key);
  if (!exists) {
    await createUserFeed(own_id);
  }
  const [updating, total, post_ids] = await Promise.all([
    isUpdatingUserFeed(own_id),
    redis.zcount(redis_key, "-inf", "+inf"),
    redis.zrevrangebyscore(
      redis_key,
      `(${after.getTime()}`,
      "-inf",
      "LIMIT",
      0,
      limit
    ),
  ]);
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
  const pageInfo: FeedPageInfo = {
    updating,
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
  { user_id: string; after: string; limit: string },
  PostsFeedResponse & { pageInfo: FeedPageInfo }
> = async (req) => {
  const own_id = req.user_id;
  const { data, after, limit, total, next } =
    await UserPaginationWrapper<PostPostges>(
      "posts",
      { user_id: own_id },
      req.limit,
      req.after
    );
  const groups = await fetchUserGroups(own_id);
  const keys = await getSymKeys(groups.map((a) => a.key_id));
  const post_ids = data.map((a) => a.id);
  const likes = await postgres<PostLikePostgres>("post_likes")
    .where({ user_id: own_id })
    .whereIn("post_id", post_ids)
    .select("id", "post_id");
  const posts_likes = await fetchPostsLikes(post_ids);
  const posts: Array<PostResponse> = [];
  for (const post of data) {
    const isLiked = likes.find((a) => a.post_id == post.id);
    const post_likes = posts_likes.find((a) => a.post_id == post.id);
    posts.push({
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
  }
  const pageInfo: FeedPageInfo = {
    updating: false,
    after: after,
    limit,
    next: next,
    total,
  };
  const feed: PostsFeedResponse = {
    posts,
    keys,
    users: {},
  };
  return {
    response: {
      ...feed,
      pageInfo: pageInfo,
    },
    error: null,
  };
};

export const GetUserPostsHandler: AppHandlerFunction<
  { username: string; user_id: string; after: string; limit: string },
  PostsFeedResponse & { pageInfo: FeedPageInfo }
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
      const { data, after, limit, total, next } =
        await UserPaginationWrapper<PostPostges>(
          "posts",
          { user_id: user.id },
          req.limit,
          req.after
        );
      const resp = await postProcessPosts(own_id, data);
      const pageInfo: FeedPageInfo = {
        updating: false,
        after: after,
        limit,
        next: next,
        total,
      };
      return {
        response: {
          ...resp,
          pageInfo,
        },
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
