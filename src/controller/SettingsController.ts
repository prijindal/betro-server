import { Request, Response } from "express";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import { UserNotificationSettingResponse } from "../interfaces/responses/UserNotificationSettingResponse";
import {
  fetchUserNotificationSettings,
  saveUserNotificationSetting,
} from "../service/SettingsService";
import { NotificationSettingsAction } from "../interfaces/database/NotificationSettingsAction";

export const getNotificationSettings = async (
  req: Request,
  res: Response<Array<UserNotificationSettingResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const notifications = await fetchUserNotificationSettings(user_id);
    res.status(200).send(notifications);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const saveNotificationSetting = async (
  req: Request<
    null,
    null,
    { action: NotificationSettingsAction; enabled: boolean }
  >,
  res: Response<UserNotificationSettingResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const notification = await saveUserNotificationSetting(
      user_id,
      req.body.action,
      req.body.enabled
    );
    res.status(200).send(notification);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
