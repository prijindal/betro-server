import { UserSettingsAction } from "../database/UserSettingsAction";

export interface UserSettingResponse {
  id: string;
  user_id: string;
  action: UserSettingsAction;
  enabled: boolean;
}
