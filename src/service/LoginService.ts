import { v4 as uuidv4 } from "uuid";
import jsonwebtoken from "jsonwebtoken";
import postgres from "../db/postgres";
import redis from "../db/redis";
import {SECRET} from "../config";

import { verifyServerHash, generateServerHash } from "../util/crypto";
import { isEmpty } from "lodash";

export type LoginBody = {
  email: string;
  master_hash: string;
  device_id: string;
  initial_device_display_name: string;
};

export const checkUserCredentials = async (
  email: string,
  password: string
): Promise<{ isValid: false } | { isValid: true; user_id: string }> => {
  const queryResult = await postgres.query(
    "SELECT id,master_hash from users WHERE email = $1",
    [email]
  );
  if (queryResult.rowCount == 0) {
    return { isValid: false };
  }
  const server_hash = queryResult.rows[0].master_hash;
  if (!verifyServerHash(password, server_hash)) {
    return { isValid: false };
  }
  return { isValid: true, user_id: queryResult.rows[0].id };
};

export const createAccessToken = async (
  user_id: string,
  device_id: string,
  initial_device_display_name?: string
): Promise<{ access_token_id: string; access_token: string }> => {
  const access_token = uuidv4();
  const access_token_hash = generateServerHash(access_token);
  const queryResult = await postgres.query(
    `INSERT INTO access_tokens(user_id, access_token_hash,device_id,initial_device_display_name)
    VALUES($1,$2,$3,$4) RETURNING *
    `,
    [user_id, access_token_hash, device_id, initial_device_display_name]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return {
    access_token_id: queryResult.rows[0].id,
    access_token: access_token,
  };
};

export const verifyAccessToken = async (
  user_id: string,
  access_token_id: string,
  access_token: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "SELECT access_token_hash FROM access_tokens WHERE id=$1 AND user_id=$2",
    [access_token_id, user_id]
  );
  if (queryResult.rowCount == 0) {
    return false;
  }
  if (!verifyServerHash(access_token, queryResult.rows[0].access_token_hash)) {
    return false;
  }
  return true;
};

export const parseJwt = async (
  jwt: string
): Promise<string> => {
  const redisKey = `jwt_${jwt}`;
  const storedUserId = await redis.get(redisKey);
  if(!isEmpty(storedUserId)) {
    return storedUserId;
  }
  const {user_id, id, key} = jsonwebtoken.verify(jwt, SECRET) as any;
  const isVerified = await verifyAccessToken(user_id, id, key);
  if(!isVerified) {
    return null;
  }
  redis.set(redisKey, user_id, "ex", 600);
  return user_id;
};
