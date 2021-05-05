import { UserNotificationsActions } from "./UserNotificationsActions";

export interface UserNotification {
  id: string;
  user_id: string;
  action: UserNotificationsActions;
  content: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: Date;
}
