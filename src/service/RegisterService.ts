import postgres from "../db/postgres";
import { generateServerHash } from "../util/crypto";

export type RegisterBody = {
  username: string;
  email: string;
  master_hash: string;
  inhibit_login: boolean;
  public_key: string;
  private_key: string;
  device_id: string;
  initial_device_display_name: string;
};

export const isEmailAvailable = async (email: string): Promise<boolean> => {
  const queryResult = await postgres.query(
    "SELECT id from users WHERE email = $1",
    [email]
  );
  return queryResult.rowCount == 0;
};

export const isUsernameAvailable = async (
  username: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "SELECT id from users WHERE username = $1",
    [username]
  );
  return queryResult.rowCount == 0;
};

export const createUser = async (
  username: string,
  email: string,
  master_hash: string,
  key_id: string
): Promise<{
  user_id: string;
}> => {
  const hash = generateServerHash(master_hash);
  const inserted = await postgres.query(
    "INSERT INTO users(username, email,master_hash, key_id) VALUES ($1,$2, $3, $4) RETURNING *",
    [username, email, hash, key_id]
  );
  if (inserted.rowCount == 0) {
    throw new Error();
  }
  return {
    user_id: inserted.rows[0].id,
  };
};
