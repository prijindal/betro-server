import postgres from "../db/postgres";

export const fetchUserTableCount = async (
  user_id: string,
  table: string
): Promise<number> => {
  const queryResult = await postgres.query(
    `SELECT count(id) FROM ${table} WHERE user_id=$1`,
    [user_id]
  );
  return parseInt(queryResult.rows[0].count, 10);
};
