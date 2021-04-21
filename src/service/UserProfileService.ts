import postgres from "../db/postgres";
import { UserProfilePostgres } from "../interfaces/database/UserProfilePostgres";

export const fetchProfiles = async (
  user_ids: Array<string>
): Promise<Array<UserProfilePostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM user_profile WHERE user_id = ANY ($1)",
    [user_ids]
  );
  return queryResult.rows;
};

export const fetchProfile = async (
  user_id: string
): Promise<UserProfilePostgres | null> => {
  const queryResult = await postgres.query(
    "SELECT * FROM user_profile WHERE user_id=$1",
    [user_id]
  );
  if (queryResult.rowCount == 0) {
    return null;
  }
  return queryResult.rows[0];
};

export const createProfile = async (
  user_id: string,
  key_id: string,
  first_name: string,
  last_name: string,
  profile_picture: string
): Promise<UserProfilePostgres> => {
  const queryResult = await postgres.query(
    "INSERT INTO user_profile(user_id,key_id,first_name,last_name,profile_picture) " +
      "VALUES($1,$2,$3,$4,$5) RETURNING *",
    [user_id, key_id, first_name, last_name, profile_picture]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0];
};

export const updateProfile = async (
  id: string,
  first_name: string,
  last_name: string,
  profile_picture: string
): Promise<UserProfilePostgres> => {
  const queryResult = await postgres.query(
    "UPDATE user_profile SET first_name = $1, last_name = $2,profile_picture = $3 " +
      " WHERE id=$4 RETURNING *",
    [first_name, last_name, profile_picture, id]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0];
};
