import postgres from "../db/postgres";
import { FollowPostgres } from "../interfaces/database";

export const checkFollow = async (
  user_id: string,
  followee_id: string
): Promise<{ id: string; is_approved: boolean }> => {
  const queryResult = await postgres<FollowPostgres>("group_follow_approvals")
    .select("id", "is_approved")
    .where({ user_id, followee_id });
  if (queryResult.length == 0) {
    return null;
  }
  return queryResult[0];
};
