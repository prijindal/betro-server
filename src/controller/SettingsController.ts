import { UserSettingsType, UserSettingPostgres } from "../interfaces/database";
import { fetchUserSettings } from "../service/SettingsService";
import postgres from "../db/postgres";
import { AppHandlerFunction } from "./expressHelper";

export interface UserSettingResponse {
  id: string;
  user_id: string;
  type: UserSettingsType;
  enabled: boolean;
}

export const GetUserSettingsHandler: AppHandlerFunction<
  { user_id: string },
  Array<UserSettingResponse>
> = async (req) => {
  const user_id = req.user_id;
  const settings = await fetchUserSettings(user_id);
  return {
    response: settings,
    error: null,
  };
};

export const SaveUserSettingHandler: AppHandlerFunction<
  { type: UserSettingsType; enabled: boolean; user_id: string },
  UserSettingResponse
> = async (req) => {
  const user_id = req.user_id;
  const type = req.type;
  const enabled = req.enabled;

  const queryResult = await postgres<UserSettingPostgres>("user_settings")
    .where({ user_id, type })
    .select("id");
  let queryResponse: Array<UserSettingPostgres>;
  if (queryResult.length == 0) {
    queryResponse = await postgres<UserSettingPostgres>("user_settings")
      .insert({ user_id, type, enabled })
      .returning("*");
  } else {
    queryResponse = await postgres<UserSettingPostgres>("user_settings")
      .where({ user_id, type })
      .update({ enabled })
      .returning("*");
  }
  return {
    response: queryResponse[0],
    error: null,
  };
};
