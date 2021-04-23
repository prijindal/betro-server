import postgres from "../db/postgres";
import { UserProfilePostgres } from "../interfaces/database/UserProfilePostgres";

export const fetchProfiles = async (user_ids: Array<string>) =>
  postgres<UserProfilePostgres>("user_profile").whereIn("user_id", user_ids);

export const fetchProfile = async (
  user_id: string,
  include_profile_picture: boolean = true
): Promise<UserProfilePostgres | null> => {
  const query = postgres<UserProfilePostgres>("user_profile")
    .where({ user_id })
    .select("id", "user_id", "key_id", "first_name", "last_name");
  if (include_profile_picture) {
    query.select("profile_picture");
  }
  const queryResult = (await query) as Array<UserProfilePostgres>;
  if (queryResult.length == 0) {
    return null;
  }
  return queryResult[0];
};

export const createProfile = async (
  user_id: string,
  key_id: string,
  first_name: string,
  last_name: string,
  profile_picture: string
): Promise<UserProfilePostgres> => {
  const queryResult = await postgres<UserProfilePostgres>("user_profile")
    .insert({ user_id, key_id, first_name, last_name, profile_picture })
    .returning("*");
  if (queryResult.length == 0) {
    throw new Error();
  }
  return queryResult[0];
};

export const updateProfile = async (
  id: string,
  first_name: string,
  last_name: string,
  profile_picture: string
) => {
  const queryResult = await postgres<UserProfilePostgres>("user_profile")
    .where({ id })
    .update({ first_name, last_name, profile_picture })
    .returning("*");
  if (queryResult.length == 0) {
    throw new Error();
  }
  return queryResult[0];
};
