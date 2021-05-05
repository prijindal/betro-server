import postgres from "../db/postgres";
import { UserSettingPostgres, UserSettingsType } from "../interfaces/database";

export const fetchUserSettings = async (
  user_id: string
): Promise<Array<UserSettingPostgres>> => {
  return postgres<UserSettingPostgres>("user_settings")
    .where({ user_id })
    .select("*");
};

export const checkUserSetting = async (
  user_id: string,
  type: UserSettingsType
): Promise<boolean> => {
  const queryResult = await postgres<UserSettingPostgres>("user_settings")
    .where({ user_id, type })
    .select("enabled");
  if (queryResult.length == 0) {
    return false;
  }
  return queryResult[0].enabled;
};
