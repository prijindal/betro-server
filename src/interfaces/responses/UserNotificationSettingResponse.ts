import { NotificationSettingsAction } from "../database/NotificationSettingsAction";

export interface UserNotificationSettingResponse {
  id: string;
  user_id: string;
  action: NotificationSettingsAction;
  enabled: boolean;
}
