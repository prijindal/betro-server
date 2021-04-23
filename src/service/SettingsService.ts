import postgres from "../db/postgres";
import { UserNotificationSettingPostgres } from "../interfaces/database/UserNotificationSettingPostgres";
import { NotificationSettingsAction } from "../interfaces/database/NotificationSettingsAction";
import { QueryResult } from "pg";

export const fetchUserNotificationSettings = async (
  user_id: string
): Promise<Array<UserNotificationSettingPostgres>> => {
  return postgres<UserNotificationSettingPostgres>("settings_notifications")
    .where({ user_id })
    .select("*");
};

export const checkUserNotificationSetting = async (
  user_id: string,
  action: NotificationSettingsAction
): Promise<boolean> => {
  const queryResult = await postgres<UserNotificationSettingPostgres>(
    "settings_notifications"
  )
    .where({ user_id, action })
    .select("enabled");
  if (queryResult.length == 0) {
    return false;
  }
  return queryResult[0].enabled;
};

export const saveUserNotificationSetting = async (
  user_id: string,
  action: NotificationSettingsAction,
  enabled: boolean
): Promise<UserNotificationSettingPostgres> => {
  const queryResult = await postgres<UserNotificationSettingPostgres>(
    "settings_notifications"
  )
    .where({ user_id, action })
    .select("id");
  let queryResponse: Array<UserNotificationSettingPostgres>;
  if (queryResult.length == 0) {
    queryResponse = await postgres<UserNotificationSettingPostgres>(
      "settings_notifications"
    )
      .insert({ user_id, action, enabled })
      .returning("*");
  } else {
    queryResponse = await postgres<UserNotificationSettingPostgres>(
      "settings_notifications"
    )
      .where({ user_id, action })
      .update({ enabled })
      .returning("*");
  }
  return queryResponse[0];
};
