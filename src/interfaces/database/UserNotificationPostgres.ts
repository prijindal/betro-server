import { UserSettingsAction } from "./UserSettingsAction";

export interface UserNotification {
  id: string;
  user_id: string;
  action: UserSettingsAction;
  content: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: Date;
}
