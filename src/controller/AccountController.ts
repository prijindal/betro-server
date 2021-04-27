import { AppHandlerFunction } from "./expressHelper";
import { fetchUsers } from "../service/UserService";
import { fetchProfile } from "../service/UserProfileService";
import { getRsaKeys, getSymKeys } from "../service/KeyService";
import {
  WhoAmiResponse,
  CountResponse,
  CountIncludeType,
  FollowPostgres,
} from "../interfaces";
import { tableCount } from "../service/helper";

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

export const GetKeysHandler: AppHandlerFunction<
  { user_id: string },
  { private_key: string; sym_key: string }
> = async (req) => {
  const user_id = req.user_id;
  const users = await fetchUsers([user_id]);
  if (users.length == 0) {
    return {
      error: {
        status: 404,
        message: "Profile not found",
        data: null,
      },
      response: null,
    };
  } else {
    const rsakeys = await getRsaKeys([users[0].rsa_key_id], true);
    const sym_keys = await getSymKeys([users[0].sym_key_id]);
    const response: { private_key: string; sym_key: string } = {
      private_key: rsakeys[0].private_key,
      sym_key: sym_keys[users[0].sym_key_id],
    };
    return {
      response,
      error: null,
    };
  }
};
