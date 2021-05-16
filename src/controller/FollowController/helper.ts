import { UserProfilePostgres } from "../../interfaces/database";

export const addProfileInfoToRow = <
  T extends {
    first_name?: string | null;
    last_name?: string | null;
    profile_picture?: string | null;
  }
>(
  row: T,
  profile: UserProfilePostgres
): T => {
  if (profile != null) {
    row.first_name = profile.first_name;
    row.last_name = profile.last_name;
    row.profile_picture = profile.profile_picture;
  }
  return row;
};
