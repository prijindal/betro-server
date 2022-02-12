import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { AppHandlerFunction } from "./expressHelper";
import {
  User,
  UserNotification,
  UserNotificationsActions,
  UserSettings,
  UserSettingsType,
} from "../entities";

export interface NotificationResponse {
  id: string;
  user_id: string;
  action: UserNotificationsActions;
  content: string;
  payload: Record<string, unknown>;
  created_at: Date;
}

@Service()
export class NotificationController {
  constructor(
    @InjectRepository(UserNotification)
    private readonly userNotificationRepository: Repository<UserNotification>,
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  sendUserNotification = async (
    user_id: string,
    action: UserNotificationsActions,
    content: string,
    payload: Record<string, unknown>
  ) => {
    const notificationEnabled = await this.userSettingsRepository.findOne(
      { user_id, type: action as unknown as UserSettingsType },
      { select: ["enabled"] }
    );
    if (notificationEnabled) {
      await this.userNotificationRepository.save(
        this.userNotificationRepository.create({
          user_id,
          action,
          content,
          payload,
        })
      );
    }
  };

  GetNotificationsHandler: AppHandlerFunction<
    { user_id: string },
    Array<NotificationResponse>
  > = async (req) => {
    const user_id = req.user_id;
    const notifications = await this.userNotificationRepository.find({
      user_id,
    });
    return {
      response: notifications,
      error: null,
    };
  };

  ReadNotificationHandler: AppHandlerFunction<
    {
      user_id: string;
      notification_id: string;
    },
    { read: boolean }
  > = async (req) => {
    const user_id = req.user_id;
    const updates = await this.userNotificationRepository.update(
      {
        user_id,
        id: req.notification_id,
      },
      {
        read: true,
      }
    );
    if (updates.affected > 0) {
      return {
        response: { read: true },
        error: null,
      };
    } else {
      return {
        error: {
          status: 404,
          message: "Notification Not Found",
          data: null,
        },
        response: null,
      };
    }
  };
}
