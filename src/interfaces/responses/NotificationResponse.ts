import { NotificationSettingsAction } from "../database/NotificationSettingsAction";

export interface NotificationResponse {
  id: string;
  user_id: string;
  action: NotificationSettingsAction;
  content: string;
  payload: Record<string, unknown>;
  created_at: Date;
}