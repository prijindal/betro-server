import postgres from "../db/postgres";

export const userEmail = async (user_id: string): Promise<string> => {
  const queryResult = await postgres.query(
    "SELECT email from users WHERE id = $1",
    [user_id]
  );
  if (queryResult.rowCount == 0) {
    return null;
  }
  return queryResult.rows[0].email;
};
