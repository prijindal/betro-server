import postgres from "../db/postgres";
import {
  UserSettingPostgres,
  UserSettingsAction,
} from "../interfaces/database";

export const fetchUserSettings = async (
  user_id: string
): Promise<Array<UserSettingPostgres>> => {
  return postgres<UserSettingPostgres>("user_settings")
    .where({ user_id })
    .select("*");
};

export const checkUserSetting = async (
  user_id: string,
  action: UserSettingsAction
): Promise<boolean> => {
  const queryResult = await postgres<UserSettingPostgres>("user_settings")
    .where({ user_id, action })
    .select("enabled");
  if (queryResult.length == 0) {
    return false;
  }
  return queryResult[0].enabled;
};
