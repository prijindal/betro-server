import crypto from "crypto";

const ITERATIONS = 10000

export const encodepbkdf2 = (password:string, algorithm:string, salt:string, iterations:number ):string => {
  const hash = crypto.pbkdf2Sync(password,salt, iterations, 32, "sha256");
  return `${algorithm}$${iterations}$${salt}$${hash.toString('base64')}`;
}

export const generateServerHash = (master_hash:string):string => {
  const salt = crypto
    .randomBytes(32)
    .toString('base64')
    .slice(0, 32);
  return encodepbkdf2(master_hash, "pbkdf2-sha256", salt, ITERATIONS);
}

export const verifyServerHash = (master_hash:string, server_hash:string):boolean => {
  const [algorithm, iterations, salt, hash] = server_hash.split('$');
  const encodedPassword = encodepbkdf2(master_hash, algorithm,salt, parseInt(iterations, 10));
  return encodedPassword === server_hash;
}
