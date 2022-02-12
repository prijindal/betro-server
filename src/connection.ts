import { createConnection } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { POSTGRES_URI } from "./config";
import {
  AccessToken,
  User,
  UserSymKey,
  UserEcdhKey,
  UserProfile,
  Post,
  PostLike,
  ProfileGrant,
  GroupPolicy,
  GroupFollowApproval,
  UserNotification,
  UserSettings,
  Message,
  Conversation,
} from "./entities";

export const connection = async (
  options: Omit<PostgresConnectionOptions, "type">
) => {
  // create TypeORM connection
  await createConnection({
    type: "postgres",
    url: POSTGRES_URI,
    entities: [
      AccessToken,
      User,
      UserEcdhKey,
      UserProfile,
      UserSymKey,
      Post,
      PostLike,
      UserNotification,
      ProfileGrant,
      UserSettings,
      GroupPolicy,
      GroupFollowApproval,
      Message,
      Conversation,
    ],
    synchronize: true,
    logger: "advanced-console",
    // logging: ["error", "schema", "warn", "migration", "info", "log", "query"],
    logging: ["error", "warn"],
    dropSchema: false,
    cache: false,
    ...options,
  });
};
