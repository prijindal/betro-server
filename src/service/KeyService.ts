import { RsaKeyPostgres } from "../interfaces/database/RsaKeyPostgres";
import postgres from "../db/postgres";

export const createSymKey = async (
  user_id: string,
  sym_key: string
): Promise<string> => {
  const queryResult = await postgres.query(
    "INSERT INTO user_sym_keys(user_id, sym_key) VALUES($1, $2) RETURNING *",
    [user_id, sym_key]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0].id;
};

export const getSymKeys = async (
  key_ids: Array<string>
): Promise<{ [key_id: string]: string }> => {
  const queryResult = await postgres.query(
    "SELECT id, sym_key from user_sym_keys WHERE id = ANY ($1)",
    [key_ids]
  );
  const keyMap: { [key_id: string]: string } = {};
  queryResult.rows.forEach((row) => {
    keyMap[row.id] = row.sym_key;
  });
  return keyMap;
};

export const deleteSymKey = async (
  user_id: string,
  key_id: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "DELETE FROM user_sym_keys WHERE user_id = $1 AND id=$2",
    [user_id, key_id]
  );
  return queryResult.rowCount == 1;
};

export const createRsaKeyPair = async (
  public_key: string,
  private_key: string
): Promise<string> => {
  const queryResult = await postgres.query(
    "INSERT INTO user_rsa_keys(public_key, private_key) VALUES($1, $2) RETURNING *",
    [public_key, private_key]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0].id;
};

export const getRsaKeys = async (
  key_ids: Array<string>,
  include_private_key: boolean
): Promise<Array<RsaKeyPostgres>> => {
  const queryResult = await postgres.query(
    `SELECT id, public_key ${
      include_private_key ? ",private_key" : ""
    } from user_rsa_keys WHERE id = ANY ($1)`,
    [key_ids]
  );
  return queryResult.rows;
};