import { v4 as uuidv4 } from "uuid";
import jsonwebtoken from "jsonwebtoken";
import postgres from "../db/postgres";
import redis from "../db/redis";
import { SECRET } from "../config";

import { verifyServerHash, generateServerHash } from "../util/crypto";
import { isEmpty } from "lodash";
import { UserPostgres } from "../interfaces/database/UserPostgres";

export type LoginBody = {
  email: string;
  master_hash: string;
  device_id: string;
  device_display_name: string;
};

export const checkUserCredentials = async (
  email: string,
  password: string
): Promise<
  { isValid: false } | { isValid: true; user_id: string; key_id: string }
> => {
  const queryResult = await postgres<UserPostgres>("users")
    .where({ email })
    .select("id", "master_hash", "key_id");
  if (queryResult.length == 0) {
    return { isValid: false };
  }
  const server_hash = queryResult[0].master_hash;
  if (!verifyServerHash(password, server_hash)) {
    return { isValid: false };
  }
  return {
    isValid: true,
    user_id: queryResult[0].id,
    key_id: queryResult[0].key_id,
  };
};

export const createAccessToken = async (
  user_id: string,
  device_id: string,
  device_display_name?: string
): Promise<{ access_token_id: string; access_token: string }> => {
  const access_token = uuidv4();
  const access_token_hash = generateServerHash(access_token);
  const queryResult = await postgres("access_tokens")
    .insert({ user_id, access_token_hash, device_id, device_display_name })
    .returning("*");
  if (queryResult.length == 0) {
    throw new Error();
  }
  return {
    access_token_id: queryResult[0].id,
    access_token: access_token,
  };
};

export const verifyAccessToken = async (
  user_id: string,
  access_token_id: string,
  access_token: string
): Promise<boolean> => {
  const queryResult = await postgres("access_tokens")
    .where({ id: access_token_id, user_id })
    .select("access_token_hash");
  if (queryResult.length == 0) {
    return false;
  }
  if (!verifyServerHash(access_token, queryResult[0].access_token_hash)) {
    return false;
  }
  return true;
};

export const parseJwt = async (
  jwt: string
): Promise<{ user_id: string; access_token_id: string }> => {
  const redisKeyUserId = `jwt_${jwt}_user_id`;
  const redisKeyTokenId = `jwt_${jwt}_token_id`;
  const storedUserId = await redis.get(redisKeyUserId);
  const storedTokenId = await redis.get(redisKeyTokenId);
  if (!isEmpty(storedUserId) && !isEmpty(storedTokenId)) {
    return { user_id: storedUserId, access_token_id: storedTokenId };
  }
  const { user_id, id, key } = jsonwebtoken.verify(jwt, SECRET) as any;
  const isVerified = await verifyAccessToken(user_id, id, key);
  if (!isVerified) {
    return { user_id: null, access_token_id: null };
  }
  redis.set(redisKeyUserId, user_id, "ex", 600);
  redis.set(redisKeyTokenId, id, "ex", 600);
  return { user_id, access_token_id: id };
};
