import postgres from "../db/postgres";
import { UserNotificationSettingPostgres } from "../interfaces/database/UserNotificationSettingPostgres";
import { NotificationSettingsAction } from "../interfaces/database/NotificationSettingsAction";
import { QueryResult } from "pg";

export const fetchUserNotificationSettings = async (
  user_id: string
): Promise<Array<UserNotificationSettingPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM settings_notifications WHERE user_id=$1",
    [user_id]
  );
  return queryResult.rows;
};

export const checkUserNotificationSetting = async (
  user_id: string,
  action: NotificationSettingsAction
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "SELECT id,enabled from settings_notifications WHERE user_id=$1 AND action=$2",
    [user_id, action]
  );
  if (queryResult.rowCount == 0) {
    return false;
  }
  return queryResult.rows[0].enabled;
};

export const saveUserNotificationSetting = async (
  user_id: string,
  action: NotificationSettingsAction,
  enabled: boolean
): Promise<UserNotificationSettingPostgres> => {
  const queryResult = await postgres.query(
    "SELECT id from settings_notifications WHERE user_id=$1 AND action=$2",
    [user_id, action]
  );
  let queryResponse: QueryResult;
  if (queryResult.rowCount == 0) {
    queryResponse = await postgres.query(
      "INSERT INTO settings_notifications(user_id, action, enabled) VALUES($1, $2, $3) RETURNING *",
      [user_id, action, enabled]
    );
  } else {
    queryResponse = await postgres.query(
      "UPDATE settings_notifications SET enabled = $1 WHERE user_id=$2 AND action=$3 RETURNING *",
      [enabled, user_id, action]
    );
  }
  return queryResponse.rows[0];
};
