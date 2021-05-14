import { ProfileGrantPostgres } from "src/interfaces/database";
import postgres from "../db/postgres";

export const createGrant = async (grant: {
  user_id: string;
  grantee_id: string;
  grantee_key_id?: string;
  user_key_id?: string;
  encrypted_sym_key?: string;
}): Promise<ProfileGrantPostgres> => {
  const {
    user_id,
    grantee_id,
    grantee_key_id,
    encrypted_sym_key,
    user_key_id,
  } = grant;
  const existingProfileGrant = await postgres<ProfileGrantPostgres>(
    "profile_grants"
  )
    .where({ user_id, grantee_id })
    .first()
    .select();
  if (existingProfileGrant != null) {
    return existingProfileGrant;
  }
  const profileGrant = await postgres<ProfileGrantPostgres>("profile_grants")
    .insert({
      user_id,
      grantee_id,
      grantee_key_id,
      encrypted_sym_key,
      user_key_id,
    })
    .returning("*");
  return profileGrant[0];
};
