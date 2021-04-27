import { Request, Response } from "express";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import {
  UserSettingResponse,
  UserSettingsAction,
  UserSettingPostgres,
} from "../interfaces";
import { fetchUserSettings } from "../service/SettingsService";
import postgres from "../db/postgres";

export const getUserSettings = async (
  req: Request,
  res: Response<Array<UserSettingResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const notifications = await fetchUserSettings(user_id);
    res.status(200).send(notifications);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const saveUserSetting = async (
  req: Request<null, null, { action: UserSettingsAction; enabled: boolean }>,
  res: Response<UserSettingResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const action = req.body.action;
    const enabled = req.body.enabled;

    const queryResult = await postgres<UserSettingPostgres>("user_settings")
      .where({ user_id, action })
      .select("id");
    let queryResponse: Array<UserSettingPostgres>;
    if (queryResult.length == 0) {
      queryResponse = await postgres<UserSettingPostgres>("user_settings")
        .insert({ user_id, action, enabled })
        .returning("*");
    } else {
      queryResponse = await postgres<UserSettingPostgres>("user_settings")
        .where({ user_id, action })
        .update({ enabled })
        .returning("*");
    }
    res.status(200).send(queryResponse[0]);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
