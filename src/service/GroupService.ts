import postgres from "../db/postgres";
import { GroupPostgres } from "../interfaces/database/GroupPostgres";

export const fetchUserGroup = async (
  user_id: string,
  group_id: string
): Promise<GroupPostgres> => {
  const queryResult = await postgres.query(
    "SELECT id,key_id,name,is_default FROM group_policies WHERE user_id = $1 AND id=$2",
    [user_id, group_id]
  );
  if (queryResult.rowCount == 0) {
    return null;
  }
  return queryResult.rows[0];
};

export const fetchUserGroups = async (
  user_id: string
): Promise<Array<GroupPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT id,key_id,name,is_default FROM group_policies WHERE user_id = $1",
    [user_id]
  );
  return queryResult.rows;
};

const clearDefaults = async (user_id: string): Promise<void> => {
  await postgres.query(
    "UPDATE group_policies SET is_default = false WHERE user_id=$1",
    [user_id]
  );
};

export const createGroup = async (
  user_id: string,
  key_id: string,
  name: string,
  is_default: boolean
): Promise<GroupPostgres> => {
  if (is_default) {
    await clearDefaults(user_id);
  }
  const queryResult = await postgres.query(
    "INSERT INTO group_policies (user_id, key_id, name, is_default)" +
      "VALUES ($1, $2, $3, $4) RETURNING id,key_id,name,is_default",
    [user_id, key_id, name, is_default]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0];
};

export const deleteUserGroup = async (
  user_id: string,
  group_id: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "DELETE FROM group_policies WHERE user_id = $1 AND id=$2",
    [user_id, group_id]
  );
  return queryResult.rowCount == 1;
};
