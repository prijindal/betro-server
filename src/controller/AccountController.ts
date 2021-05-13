import { AppHandlerFunction } from "./expressHelper";
import { fetchUsers } from "../service/UserService";
import { fetchProfile } from "../service/UserProfileService";
import { getRsaKeys } from "../service/KeyService";
import { FollowPostgres, UserNotification } from "../interfaces/database";
import { tableCount } from "../service/helper";

export interface WhoAmiResponse {
  user_id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export const WhoAmiHandler: AppHandlerFunction<
  { user_id: string },
  WhoAmiResponse
> = async (req) => {
  const user_id = req.user_id;
  const users = await fetchUsers([user_id]);
  if (users.length == 1) {
    const keys = await getRsaKeys([users[0].rsa_key_id], true);
    if (keys.length == 1) {
      const response: WhoAmiResponse = {
        user_id,
        email: users[0].email,
        username: users[0].username,
      };
      const profile = await fetchProfile(user_id, false);
      if (profile != null) {
        response.first_name = profile.first_name;
        response.last_name = profile.last_name;
      }
      return {
        response,
        error: null,
      };
    } else {
      return {
        response: null,
        error: {
          status: 503,
          message: "Some error occurred",
          data: null,
        },
      };
    }
  } else {
    return {
      response: null,
      error: {
        status: 503,
        message: "Some error occurred",
        data: null,
      },
    };
  }
};

export type CountIncludeType =
  | "notifications"
  | "settings"
  | "groups"
  | "followers"
  | "followees"
  | "approvals"
  | "posts";

export interface CountResponse {
  notifications?: number;
  settings?: number;
  groups?: number;
  followers?: number;
  followees?: number;
  approvals?: number;
  posts?: number;
}

export const GetCountsHandler: AppHandlerFunction<
  { user_id: string; include_fields: string },
  CountResponse
> = async (req) => {
  const user_id = req.user_id;
  const response: CountResponse = {};
  const includeFieldsString = req.include_fields;
  const include_fields: Array<CountIncludeType> = includeFieldsString.split(
    ","
  ) as Array<CountIncludeType>;
  const tableMapping: { [k: string]: string } = {
    notifications: "user_notifications",
    settings: "user_settings",
    groups: "group_policies",
    followees: "group_follow_approvals",
    posts: "posts",
  };
  const promises: Array<Promise<number>> = [];
  for (const include_field of include_fields) {
    if (include_field == "followers") {
      promises.push(
        tableCount<FollowPostgres>("group_follow_approvals", {
          followee_id: user_id,
          is_approved: true,
        })
      );
    } else if (include_field == "approvals") {
      promises.push(
        tableCount<FollowPostgres>("group_follow_approvals", {
          followee_id: user_id,
          is_approved: false,
        })
      );
    } else if (include_field == "notifications") {
      promises.push(
        tableCount<UserNotification>("user_notifications", {
          user_id,
          read: false,
        })
      );
    } else {
      const table = tableMapping[include_field];
      if (table != null) {
        promises.push(
          tableCount<{ user_id: string; id: string }>(table, { user_id })
        );
      }
    }
  }
  const resp = await Promise.all(promises);
  for (let index = 0; index < include_fields.length; index++) {
    const include_field = include_fields[index];
    response[include_field] = resp[index];
  }
  return {
    response,
    error: null,
  };
};
