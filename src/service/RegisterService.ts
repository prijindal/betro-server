import postgres from "../db/postgres";
import { generateServerHash } from "../util/crypto";

export type RegisterBody =
  | {
      email: string;
      master_hash: string;
      inhibit_login: false;
    }
  | {
      email: string;
      master_hash: string;
      inhibit_login: true;
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

export const createUser = async (
  body: RegisterBody
): Promise<{
  user_id: string;
}> => {
  const hash = generateServerHash(body.master_hash);
  const inserted = await postgres.query(
    "INSERT INTO users(email,master_hash) VALUES ($1,$2) RETURNING *",
    [body.email, hash]
  );
  if (inserted.rowCount == 0) {
    throw new Error();
  }
  return {
    user_id: inserted.rows[0].id,
  };
};
