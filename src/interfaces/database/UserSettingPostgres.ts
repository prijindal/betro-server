import { UserSettingsAction } from "./UserSettingsAction";

export interface UserSettingPostgres {
  id: string;
  user_id: string;
  action: UserSettingsAction;
  enabled: boolean;
}
