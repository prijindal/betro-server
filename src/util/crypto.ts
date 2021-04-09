import crypto from "crypto";

const KEY_LENGTH = 64;

export const generateServerHash = (master_hash: string): string => {
  const salt = crypto.randomBytes(32).toString("base64").slice(0, 32);
  const hash = crypto.scryptSync(master_hash, salt, KEY_LENGTH);
  return `${salt}:${hash.toString("base64")}`;
};

export const verifyServerHash = (
  master_hash: string,
  server_hash: string
): boolean => {
  const [salt, key] = server_hash.split(":");
  const keyBuffer = Buffer.from(key, "base64");
  const derivedKey = crypto.scryptSync(master_hash, salt, KEY_LENGTH);
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
};
