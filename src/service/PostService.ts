import postgres from "../db/postgres";
import { PostPostges } from "../interfaces/database/PostPostgres";

export const fetchUserPosts = async (
  user_id: string
): Promise<Array<PostPostges>> => {
  return await postgres<PostPostges>("posts").where({ user_id }).select("*");
};

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
