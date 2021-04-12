import postgres from "../db/postgres";
import { UserPostgres } from "../interfaces/database/UserPostgres";

export const fetchUsers = async (
  user_ids: Array<string>
): Promise<Array<UserPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM users WHERE id = ANY ($1)",
    [user_ids]
  );
  return queryResult.rows;
};
