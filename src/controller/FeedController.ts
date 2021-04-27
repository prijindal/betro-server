import { Request, Response } from "express";
import { errorResponse } from "../util/responseHandler";
import {
  PostResponse,
  PostsFeedResponse,
} from "../interfaces/responses/PostResponse";
import { ErrorDataType } from "../constant/ErrorData";
import { postProcessPosts } from "../service/FeedService";
import postgres from "../db/postgres";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";
import { GroupPostgres } from "src/interfaces/database/GroupPostgres";
import { PostPostges } from "src/interfaces/database/PostPostgres";
import { AppHandlerFunction } from "./expressHelper";
import { fetchUserPosts } from "../service/PostService";
import { fetchUserGroups } from "../service/GroupService";
import { getSymKeys } from "../service/KeyService";

export const getHomeFeed = async (
  req: Request,
  res: Response<PostsFeedResponse | ErrorDataType>
): Promise<void> => {
  const own_id = res.locals.user_id;
  try {
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
      .innerJoin<PostPostges>(
        "posts",
        "posts.group_id",
        "=",
        "group_policies.id"
      )
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
    res.status(200).send(response);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
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
