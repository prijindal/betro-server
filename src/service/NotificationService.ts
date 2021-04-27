import postgres from "../db/postgres";
import { UserNotification, UserSettingsAction } from "../interfaces/database";

export const fetchUserNotifications = async (
  user_id: string
): Promise<Array<UserNotification>> => {
  return await postgres<UserNotification>("user_notifications")
    .where({ user_id })
    .select("*");
};

export const createUserNotification = async (
  user_id: string,
  action: UserSettingsAction,
  content: string,
  payload: Record<string, unknown>
): Promise<UserNotification> => {
  const queryResult = await postgres<UserNotification>("user_notifications")
    .insert({ user_id, action, payload, content })
    .returning("*");
  return queryResult[0];
};
