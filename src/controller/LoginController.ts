import { IncomingHttpHeaders } from "http";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { isEmpty } from "lodash";
import jsonwebtoken from "jsonwebtoken";
import { errorResponse } from "../util/responseHandler";
import {
  isEmailAvailable,
  isUsernameAvailable,
  RegisterBody,
  createUser,
} from "../service/RegisterService";
import {
  LoginBody,
  checkUserCredentials,
  createAccessToken,
} from "../service/LoginService";
import { SECRET } from "../config";
import {
  createRsaKeyPair,
  createSymKey,
  getRsaKeys,
  getSymKeys,
} from "../service/KeyService";
import { fetchUsers } from "../service/UserService";
import {
  createProfile,
  fetchProfile,
  updateProfile,
} from "../service/UserProfileService";
import { ErrorDataType } from "../constant/ErrorData";
import { UserProfileResponse } from "../interfaces/responses/UserProfileResponse";
import { WhoAmiResponse } from "../interfaces/responses/WhoAmiResponse";

export const availableUsername = async (
  req: Request<null, null, null, { username: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryResult = await isUsernameAvailable(req.query.username);
    if (queryResult) {
      res.status(200).send({ available: true });
    } else {
      res.status(400).send(errorResponse(400, "Username is not available"));
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
    next(e);
  }
};

export const availableEmail = async (
  req: Request<null, null, null, { email: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryResult = await isEmailAvailable(req.query.email);
    if (queryResult) {
      res.status(200).send({ available: true });
    } else {
      res.status(400).send(errorResponse(400, "Email is not available"));
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
    next(e);
  }
};

export const registerUser = async (
  req: Request<null, null, RegisterBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const emailAvailableResult = await isEmailAvailable(req.body.email);
    const usernameAvailableResult = await isUsernameAvailable(
      req.body.username
    );
    if (emailAvailableResult && usernameAvailableResult) {
      const public_key = req.body.public_key;
      const private_key = req.body.private_key;
      const key_id = await createRsaKeyPair(public_key, private_key);
      const response = await createUser(
        req.body.username,
        req.body.email,
        req.body.master_hash,
        key_id
      );
      if (!req.body.inhibit_login) {
        res.status(200).send(response);
      } else {
        try {
          const { token, device_id } = await loginHelper(
            response.user_id,
            req.body.device_id,
            req.body.initial_device_display_name,
            req.headers
          );
          res.status(200).send({ token, device_id });
        } catch (e) {
          res.status(502).send(errorResponse(502));
          next(e);
        }
      }
    } else {
      res.status(400).send(errorResponse(400, "Email is not available"));
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
    next(e);
  }
};

export const loginUser = async (
  req: Request<null, null, LoginBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const verifiedObject = await checkUserCredentials(
      req.body.email,
      req.body.master_hash
    );
    if (verifiedObject.isValid == false) {
      res.status(403).send(errorResponse(403, "Invalid Credentials"));
    } else {
      try {
        const { token, device_id } = await loginHelper(
          verifiedObject.user_id,
          req.body.device_id,
          req.body.device_display_name,
          req.headers
        );
        const rsaKeys = await getRsaKeys([verifiedObject.key_id], true);
        if (rsaKeys.length == 0) {
          res
            .status(404)
            .send(
              errorResponse(
                404,
                "Your account has some issues. Please register again"
              )
            );
        } else {
          res.status(200).send({
            token,
            device_id,
            public_key: rsaKeys[0].public_key,
            private_key: rsaKeys[0].private_key,
          });
        }
      } catch (e) {
        res.status(502).send(errorResponse(502));
        next(e);
      }
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
    next(e);
  }
};

export const loginHelper = async (
  user_id: string,
  device_id: string,
  device_display_name: string,
  headers: IncomingHttpHeaders
): Promise<{
  token: string;
  device_id: string;
}> => {
  if (isEmpty(device_id)) {
    device_id = uuidv4();
  }
  if (isEmpty(device_display_name)) {
    device_display_name = headers["user-agent"];
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
    const keys = await getRsaKeys([users[0].key_id], true);
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
      const keys = await getRsaKeys([users[0].key_id], true);
      if (keys.length == 0) {
        res.status(500).send(errorResponse(500));
      } else {
        const response: { private_key: string; sym_key?: string } = {
          private_key: keys[0].private_key,
        };
        const profile = await fetchProfile(user_id, false);
        if (profile != null) {
          const sym_keys = await getSymKeys([profile.key_id]);
          response.sym_key = sym_keys[profile.key_id];
        }
        res.status(200).send(response);
      }
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const getProfilePicture = async (
  req: Request,
  res: Response<string | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const profile = await fetchProfile(user_id);
    if (profile == null) {
      res.status(404).send(errorResponse(404, "User Profile not found"));
    } else {
      res.status(200).send(profile.profile_picture);
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const getProfile = async (
  req: Request,
  res: Response<UserProfileResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const profile = await fetchProfile(user_id);
    if (profile == null) {
      res.status(404).send(errorResponse(404, "User Profile not found"));
    } else {
      const sym_key = await getSymKeys([profile.key_id]);
      res.status(200).send({
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_picture: profile.profile_picture,
        sym_key: sym_key[profile.key_id],
      });
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const postProfile = async (
  req: Request<
    null,
    null,
    {
      sym_key: string;
      first_name: string;
      last_name: string;
      profile_picture: string;
    }
  >,
  res: Response<UserProfileResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const profile = await fetchProfile(user_id);
    if (profile == null) {
      const key_id = await createSymKey(user_id, req.body.sym_key);
      const updatedProfile = await createProfile(
        user_id,
        key_id,
        req.body.first_name,
        req.body.last_name,
        req.body.profile_picture
      );
      const sym_key = await getSymKeys([updatedProfile.key_id]);
      res.status(200).send({
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        profile_picture: updatedProfile.profile_picture,
        sym_key: sym_key[updatedProfile.key_id],
      });
    } else {
      res.status(404).send(errorResponse(404));
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const putProfile = async (
  req: Request<
    null,
    null,
    {
      first_name?: string;
      last_name?: string;
      profile_picture?: string;
    }
  >,
  res: Response<UserProfileResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const profile = await fetchProfile(user_id);
    if (profile == null) {
      res.status(404).send(errorResponse(404));
    } else {
      let first_name = req.body.first_name;
      if (isEmpty(first_name)) {
        first_name = profile.first_name;
      }
      let last_name = req.body.last_name;
      if (isEmpty(last_name)) {
        last_name = profile.last_name;
      }
      let profile_picture = req.body.profile_picture;
      if (isEmpty(profile_picture)) {
        profile_picture = profile.profile_picture;
      }
      const updatedProfile = await updateProfile(
        profile.id,
        first_name,
        last_name,
        profile_picture
      );
      const sym_key = await getSymKeys([updatedProfile.key_id]);
      res.status(200).send({
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        profile_picture: updatedProfile.profile_picture,
        sym_key: sym_key[updatedProfile.key_id],
      });
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
