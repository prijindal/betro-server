import { UserSettingsType } from "./UserSettingsType";

export interface UserSettingPostgres {
  id: string;
  user_id: string;
  type: UserSettingsType;
  enabled: boolean;
}
