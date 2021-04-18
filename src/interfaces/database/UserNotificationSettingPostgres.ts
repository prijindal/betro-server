import { NotificationSettingsAction } from "./NotificationSettingsAction";

export interface UserNotificationSettingPostgres {
  id: string;
  user_id: string;
  action: NotificationSettingsAction;
  enabled: boolean;
}
