import { v4 as uuidv4 } from 'uuid';
import postgres from "../db/postgres";
import redis from "../db/redis";

import { verifyServerHash } from "../util/crypto";

export type LoginBody =
  {
    email: string;
    master_hash: string;
    device_id: string;
    initial_device_display_name: string;
  };

export const checkUserCredentials = async (email:string, password: string):Promise<{isValid: false} | {isValid: true, user_id: string}> => {
  const queryResult = await postgres.query("SELECT id,master_hash from users WHERE email = $1", [email]);
  if(queryResult.rowCount == 0) {
    return {isValid: false};
  }
  const server_hash = queryResult.rows[0].master_hash;
  if(!verifyServerHash(password, server_hash)) {
    return {isValid: false};
  }
  return {isValid: true, user_id: queryResult.rows[0].id};
};

export const createAccessToken = async(user_id: string,device_id: string,initial_device_display_name?:string):Promise<string> => {
  const access_token = uuidv4();
  const queryResult = await postgres.query(
    `INSERT INTO access_tokens(user_id, access_token,device_id,initial_device_display_name)
    VALUES($1,$2,$3,$4) RETURNING *
    `,
    [user_id,access_token,device_id,initial_device_display_name]
  );
  if(queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0].access_token;
};
