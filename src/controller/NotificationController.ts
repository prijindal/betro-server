import { Request, Response } from "express";
import {
  fetchUserNotifications,
  createUserNotification,
} from "../service/NotificationService";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import { NotificationResponse, UserSettingsAction } from "../interfaces";
import { checkUserSetting } from "../service/SettingsService";

export const sendUserNotification = async (
  user_id: string,
  action: UserSettingsAction,
  content: string,
  payload: Record<string, unknown>
) => {
  const notificationEnabled = await checkUserSetting(user_id, action);
  if (notificationEnabled) {
    await createUserNotification(user_id, action, content, payload);
  }
};

export const getNotifications = async (
  req: Request,
  res: Response<Array<NotificationResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const notifications = await fetchUserNotifications(user_id);
    res.status(200).send(notifications);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
