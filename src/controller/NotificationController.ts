import {
  fetchUserNotifications,
  createUserNotification,
} from "../service/NotificationService";
import { UserNotification, UserSettingsAction } from "..///interfaces/database";
import { checkUserSetting } from "../service/SettingsService";
import { AppHandlerFunction } from "./expressHelper";
import postgres from "../db/postgres";

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

export const ReadNotificationHandler: AppHandlerFunction<
  {
    user_id: string;
    notification_id: string;
  },
  { read: boolean }
> = async (req) => {
  const user_id = req.user_id;
  const updates = await postgres<UserNotification>("user_notifications")
    .where({ user_id, id: req.notification_id })
    .update({ read: true })
    .returning("read");
  if (updates.length > 0) {
    return {
      response: { read: updates[0] },
      error: null,
    };
  } else {
    return {
      error: {
        status: 404,
        message: "Notification Not Found",
        data: null,
      },
      response: null,
    };
  }
};
