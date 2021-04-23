import postgres from "../db/postgres";
import { UserPostgres } from "../interfaces/database/UserPostgres";

export const fetchUsers = async (
  user_ids: Array<string>
): Promise<Array<UserPostgres>> => {
  const queryResult = await postgres<UserPostgres>("users")
    .select("*")
    .whereIn("id", user_ids);
  return queryResult;
};

export const fetchUserByUsername = async (
  username: string
): Promise<UserPostgres | null> => {
  const queryResult = await postgres<UserPostgres>("users")
    .select("*")
    .where({ username });
  if (queryResult.length == 0) {
    return null;
  }
  return queryResult[0];
};
