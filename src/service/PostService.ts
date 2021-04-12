import postgres from "../db/postgres";
import { PostPostges } from "../interfaces/database/PostPostgres";

export const fetchUserPosts = async (
  user_id: string
): Promise<Array<PostPostges>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM posts WHERE user_id=$1",
    [user_id]
  );
  return queryResult.rows;
};

export const createPostDatabase = async (
  user_id: string,
  group_id: string,
  key_id: string,
  media_content: string,
  media_encoding: string,
  text_content: string
): Promise<PostPostges> => {
  const queryResult = await postgres.query(
    "INSERT INTO posts(user_id, group_id, key_id, text_content, media_content, media_encoding) " +
      "VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
    [user_id, group_id, key_id, text_content, media_content, media_encoding]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0];
};
