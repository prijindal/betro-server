import { UserPostgres } from "../interfaces/database";
import postgres from "../db/postgres";
import { generateServerHash } from "../util/crypto";

export type RegisterBody = {
  username: string;
  email: string;
  master_hash: string;
  inhibit_login: boolean;
  sym_key: string;
  device_id: string;
  initial_device_display_name: string;
};

export const isEmailAvailable = async (email: string): Promise<boolean> => {
  const queryResult = await postgres<UserPostgres>("users")
    .where({ email })
    .select("id");
  return queryResult.length == 0;
};

export const isUsernameAvailable = async (
  username: string
): Promise<boolean> => {
  const queryResult = await postgres<UserPostgres>("users")
    .where({ username })
    .select("id");
  return queryResult.length == 0;
};

export const createUser = async (
  username: string,
  email: string,
  master_hash: string,
  sym_key_id: string
): Promise<{
  user_id: string;
}> => {
  const hash = generateServerHash(master_hash);
  const queryResult = await postgres<UserPostgres>("users")
    .insert({ username, email, master_hash: hash, sym_key_id })
    .returning("id");
  return {
    user_id: queryResult[0],
  };
};
