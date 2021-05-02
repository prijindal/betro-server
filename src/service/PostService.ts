import postgres from "../db/postgres";
import redis from "../db/redis";
import { FollowPostgres, PostPostges } from "../interfaces/database";

export const createPostDatabase = async (
  user_id: string,
  group_id: string,
  key_id: string,
  media_content: string,
  media_encoding: string,
  text_content: string
): Promise<PostPostges> => {
  const queryResult = await postgres<PostPostges>("posts")
    .insert({
      user_id,
      group_id,
      key_id,
      text_content,
      media_content,
      media_encoding,
    })
    .returning("*");
  if (queryResult.length == 0) {
    throw new Error();
  }
  return queryResult[0];
};

export const createPostRedisTrigger = async (
  post_id: string
): Promise<void> => {
  const post = await postgres<PostPostges>("posts")
    .where({ id: post_id })
    .select("id", "user_id", "created_at")
    .first();
  const followers = await postgres<FollowPostgres>("group_follow_approvals")
    .where({ followee_id: post.user_id, is_approved: true })
    .select("user_id");
  followers.forEach((follower) => {
    redis.zaddBuffer(
      `${follower.user_id}-feed`,
      post.created_at.getTime(),
      Buffer.from(post.id, "utf-8")
    );
  });
};
