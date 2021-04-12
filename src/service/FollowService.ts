import postgres from "../db/postgres";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";

export const checkFollow = async (
  user_id: string,
  followee_id: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "SELECT id from group_follow_approvals WHERE user_id = $1 AND followee_id = $2",
    [user_id, followee_id]
  );
  return queryResult.rowCount == 1;
};

export const createFollow = async (
  user_id: string,
  followee_id: string,
  key_id: string
): Promise<FollowPostgres> => {
  const queryResult = await postgres.query(
    "INSERT INTO group_follow_approvals(user_id, followee_id, key_id) VALUES($1, $2, $3) RETURNING *",
    [user_id, followee_id, key_id]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0];
};
