import postgres from "../db/postgres";
import { GroupPostgres } from "../interfaces/database";

export const fetchUserGroup = async (
  user_id: string,
  group_id: string
): Promise<GroupPostgres> => {
  const queryResult = await postgres<GroupPostgres>("group_policies")
    .where({ user_id, id: group_id })
    .select("*");
  if (queryResult.length == 0) {
    return null;
  }
  return queryResult[0];
};

export const fetchUserGroups = async (
  user_id: string
): Promise<Array<GroupPostgres>> => {
  const queryResult = await postgres<GroupPostgres>("group_policies")
    .select("*")
    .where({ user_id });
  return queryResult;
};

export const fetchGroups = async (
  group_ids: Array<string>
): Promise<Array<GroupPostgres>> => {
  const queryResult = await postgres<GroupPostgres>("group_policies")
    .select("*")
    .whereIn("id", group_ids);
  return queryResult;
};

const clearDefaults = async (user_id: string): Promise<void> => {
  return postgres<GroupPostgres>("group_policies")
    .where({ user_id })
    .update({ is_default: false });
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
  const queryResult = await postgres<GroupPostgres>("group_policies")
    .insert({ user_id, key_id, name, is_default })
    .returning("*");
  if (queryResult.length == 0) {
    throw new Error();
  }
  return queryResult[0];
};

export const deleteUserGroup = async (
  user_id: string,
  group_id: string
): Promise<boolean> => {
  const queryResult = await postgres<GroupPostgres>("group_policies")
    .where({ user_id, id: group_id })
    .delete();
  return queryResult == 1;
};
