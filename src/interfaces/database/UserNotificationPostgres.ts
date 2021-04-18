import { NotificationSettingsAction } from "./NotificationSettingsAction";

export interface UserNotification {
  id: string;
  user_id: string;
  action: NotificationSettingsAction;
  content: string;
  payload: Record<string, unknown>;
  created_at: Date;
}
