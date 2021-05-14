import postgres from "../db/postgres";
import { SymKeyPostgres } from "../interfaces/database";

export const createSymKey = async (sym_key: string): Promise<string> => {
  const queryResult = await postgres<SymKeyPostgres>("user_sym_keys")
    .insert({ sym_key })
    .returning("*");
  return queryResult[0].id;
};

export const getSymKeys = async (
  key_ids: Array<string>
): Promise<{ [key_id: string]: string }> => {
  const queryResult = await postgres<SymKeyPostgres>("user_sym_keys")
    .select("id", "sym_key")
    .whereIn("id", key_ids);
  const keyMap: { [key_id: string]: string } = {};
  queryResult.forEach((row) => {
    keyMap[row.id] = row.sym_key;
  });
  return keyMap;
};

export const deleteSymKey = async (key_id: string): Promise<boolean> => {
  const queryResult = await postgres<SymKeyPostgres>("user_sym_keys")
    .where({ id: key_id })
    .delete();
  return queryResult == 1;
};
