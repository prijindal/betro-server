import { Request, Response } from "express";
import { errorResponse } from "../util/responseHandler";
import { PostsFeedResponse } from "../interfaces/responses/PostResponse";
import { ErrorDataType } from "../constant/ErrorData";
import { postProcessPosts } from "../service/FeedService";
import postgres from "../db/postgres";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";
import { GroupPostgres } from "src/interfaces/database/GroupPostgres";
import { PostPostges } from "src/interfaces/database/PostPostgres";

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
