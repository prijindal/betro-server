import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { isEmpty } from "lodash";
import jsonwebtoken from "jsonwebtoken";
import { errorResponse } from "../util/responseHandler";
import {
  LoginBody,
  checkUserCredentials,
  createAccessToken,
} from "../service/LoginService";
import { SECRET } from "../config";
import { getRsaKeys, getSymKeys } from "../service/KeyService";
import { fetchUsers } from "../service/UserService";
import { fetchProfile } from "../service/UserProfileService";
import { ErrorDataType } from "../constant/ErrorData";
import { WhoAmiResponse } from "../interfaces/responses/WhoAmiResponse";
import { CountResponse } from "../interfaces/responses/CountResponse";
import { CountIncludeType } from "../interfaces/requests/CountRequest";
import { tableCount } from "../service/helper";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";
import {
  PostsFeedResponse,
  PostResponse,
} from "../interfaces/responses/PostResponse";
import { fetchUserPosts } from "../service/PostService";
import { fetchUserGroups } from "../service/GroupService";
import { AppHandlerFunction } from "./expressHelper";

export const LoginUserHandler: AppHandlerFunction<
  LoginBody & { user_agent: string },
  {
    token: string;
    device_id: string;
    public_key: string;
    private_key: string;
    sym_key: string;
  }
> = async ({
  email,
  master_hash,
  device_id,
  device_display_name,
  user_agent,
}) => {
  const verifiedObject = await checkUserCredentials(email, master_hash);
  if (verifiedObject.isValid == false) {
    return {
      error: { status: 403, message: "Invalid Credentials", data: null },
      response: null,
    };
  } else {
    const loggedInData = await loginHelper(
      verifiedObject.user_id,
      device_id,
      device_display_name,
      user_agent
    );
    const rsaKeys = await getRsaKeys([verifiedObject.rsa_key_id], true);
    const symKeys = await getSymKeys([verifiedObject.sym_key_id]);
    if (rsaKeys.length == 0) {
      return {
        error: {
          status: 404,
          message: "Your account has some issues. Pleae register again",
          data: null,
        },
        response: null,
      };
    } else {
      return {
        error: null,
        response: {
          token: loggedInData.token,
          device_id: loggedInData.device_id,
          public_key: rsaKeys[0].public_key,
          private_key: rsaKeys[0].private_key,
          sym_key: symKeys[verifiedObject.sym_key_id],
        },
      };
    }
  }
};

export const loginHelper = async (
  user_id: string,
  device_id: string,
  device_display_name: string,
  user_agent: string
): Promise<{
  token: string;
  device_id: string;
}> => {
  if (isEmpty(device_id)) {
    device_id = uuidv4();
  }
  if (isEmpty(device_display_name)) {
    device_display_name = user_agent;
  }
  const { access_token_id, access_token } = await createAccessToken(
    user_id,
    device_id,
    device_display_name
  );
  const token = jsonwebtoken.sign(
    { user_id, id: access_token_id, key: access_token },
    SECRET
  );
  // Create access token and send
  return { token, device_id };
};

export const whoAmi = async (
  req: Request,
  res: Response<WhoAmiResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  const users = await fetchUsers([res.locals.user_id]);
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
      res.status(200).send(response);
    } else {
      res.status(503).send(errorResponse(503));
    }
  } else {
    res.status(503).send(errorResponse(503));
  }
};

export const getKeys = async (
  req: Request,
  res: Response<{ private_key: string; sym_key?: string } | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const users = await fetchUsers([user_id]);
    if (users.length == 0) {
      res.status(500).send(errorResponse(500));
    } else {
      const keys = await getRsaKeys([users[0].rsa_key_id], true);
      if (keys.length == 0) {
        res.status(500).send(errorResponse(500));
      } else {
        const response: { private_key: string; sym_key?: string } = {
          private_key: keys[0].private_key,
        };
        const sym_keys = await getSymKeys([users[0].sym_key_id]);
        response.sym_key = sym_keys[users[0].sym_key_id];
        res.status(200).send(response);
      }
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const fetchCounts = async (
  req: Request<
    null,
    null,
    null,
    {
      include_fields: string;
    }
  >,
  res: Response<CountResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const response: CountResponse = {};
    const includeFieldsString = req.query.include_fields;
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
    res.status(200).send(response);
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const fetchOwnPosts = async (
  req: Request,
  res: Response<PostsFeedResponse | ErrorDataType>
): Promise<void> => {
  const own_id = res.locals.user_id;
  try {
    const postsResponse = await fetchUserPosts(own_id);
    const groups = await fetchUserGroups(own_id);
    const keys = await getSymKeys(groups.map((a) => a.key_id));
    const posts: Array<PostResponse> = [];
    for (const post of postsResponse) {
      posts.push({
        id: post.id,
        user_id: post.user_id,
        media_content: post.media_content,
        media_encoding: post.media_encoding,
        text_content: post.text_content,
        key_id: post.key_id,
        created_at: post.created_at,
      });
    }
    const feed: PostsFeedResponse = {
      posts,
      keys,
      users: {},
    };
    res.status(200).send(feed);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
