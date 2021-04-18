import postgres from "../db/postgres";
import { UserNotification } from "../interfaces/database/UserNotificationPostgres";
import { NotificationSettingsAction } from "../interfaces/database/NotificationSettingsAction";

export const fetchUserNotifications = async (
  user_id: string
): Promise<Array<UserNotification>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM user_notifications WHERE user_id=$1",
    [user_id]
  );
  return queryResult.rows;
};

export const createUserNotification = async (
  user_id: string,
  action: NotificationSettingsAction,
  content: string,
  payload: Record<string, unknown>
): Promise<UserNotification> => {
  const queryResult = await postgres.query(
    "INSERT INTO user_notifications(user_id,action,content,payload) VALUES ($1,$2,$3,$4) RETURNING *",
    [user_id, action, content, payload]
  );
  return queryResult.rows[0];
};
