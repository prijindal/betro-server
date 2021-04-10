import postgres from "../db/postgres";

interface Group {
  id: string;
  key_id: string;
  name: string;
  is_default: string;
}

export const fetchUserGroups = async (
  user_id: string
): Promise<Array<Group>> => {
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
): Promise<Group> => {
  if (is_default) {
    await clearDefaults(user_id);
  }
  console.log(name);
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
