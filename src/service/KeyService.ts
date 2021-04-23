import { RsaKeyPostgres } from "../interfaces/database/RsaKeyPostgres";
import { SymKeyPostgres } from "../interfaces/database/SymKeyPostgres";
import postgres from "../db/postgres";

export const createSymKey = async (
  user_id: string,
  sym_key: string
): Promise<string> => {
  const queryResult = await postgres<SymKeyPostgres>("user_sym_keys")
    .insert({ user_id, sym_key })
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

export const deleteSymKey = async (
  user_id: string,
  key_id: string
): Promise<boolean> => {
  const queryResult = await postgres<SymKeyPostgres>("user_sym_keys")
    .where({ user_id, id: key_id })
    .delete();
  return queryResult == 1;
};

export const createRsaKeyPair = async (
  public_key: string,
  private_key: string
): Promise<string> => {
  const queryResult = await postgres<RsaKeyPostgres>("user_rsa_keys")
    .insert({ public_key, private_key })
    .returning("*");
  if (queryResult.length == 0) {
    throw new Error();
  }
  return queryResult[0].id;
};

export const getRsaKeys = async (
  key_ids: Array<string>,
  include_private_key: boolean
): Promise<Array<RsaKeyPostgres>> => {
  const query = postgres<RsaKeyPostgres>("user_rsa_keys")
    .select("id", "public_key")
    .whereIn("id", key_ids);
  if (include_private_key) {
    query.select("private_key");
  }
  const queryResult = await query;
  return queryResult;
};
