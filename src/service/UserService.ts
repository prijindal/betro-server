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

export const fetchUserByUsername = async (
  username: string
): Promise<UserPostgres | null> => {
  const queryResult = await postgres.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  if (queryResult.rowCount == 0) {
    return null;
  }
  return queryResult.rows[0];
};
