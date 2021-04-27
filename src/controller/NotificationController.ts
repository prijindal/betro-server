import {
  fetchUserNotifications,
  createUserNotification,
} from "../service/NotificationService";
import { UserSettingsAction } from "..///interfaces/database";
import { checkUserSetting } from "../service/SettingsService";
import { AppHandlerFunction } from "./expressHelper";

export interface NotificationResponse {
  id: string;
  user_id: string;
  action: UserSettingsAction;
  content: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

export const sendUserNotification = async (
  user_id: string,
  action: UserSettingsAction,
  content: string,
  payload: Record<string, unknown>
) => {
  const notificationEnabled = await checkUserSetting(user_id, action);
  if (notificationEnabled) {
    await createUserNotification(user_id, action, content, payload);
  }
};

export const GetNotificationsHandler: AppHandlerFunction<
  { user_id: string },
  Array<NotificationResponse>
> = async (req) => {
  const user_id = req.user_id;
  const notifications = await fetchUserNotifications(user_id);
  return {
    response: notifications,
    error: null,
  };
};
