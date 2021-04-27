import { Request, Response } from "express";
import { fetchUserNotifications } from "../service/NotificationService";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import { NotificationResponse } from "../interfaces";

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
