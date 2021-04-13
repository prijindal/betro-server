import { IncomingHttpHeaders } from "http";
import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { isEmpty } from "lodash";
import jsonwebtoken from "jsonwebtoken";
import { errorResponse } from "../util/responseHandler";
import {
  isEmailAvailable,
  RegisterBody,
  createUser,
} from "../service/RegisterService";
import {
  LoginBody,
  checkUserCredentials,
  createAccessToken,
} from "../service/LoginService";
import { SECRET } from "../config";
import { userEmail } from "../service/AccountService";
import { createRsaKeyPair, getRsaKeys } from "../service/KeyService";
import { fetchUsers } from "../service/UserService";

export const availableUser = async (
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
    const queryResult = await isEmailAvailable(req.body.email);
    if (queryResult) {
      const public_key = req.body.public_key;
      const private_key = req.body.private_key;
      const key_id = await createRsaKeyPair(public_key, private_key);
      const response = await createUser(
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

export const whoAmi = async (req: Request, res: Response): Promise<void> => {
  const user_id = res.locals.user_id;
  const email = await userEmail(user_id);
  res.status(200).send({ user_id, email });
};

export const getKeys = async (req: Request, res: Response): Promise<void> => {
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
        res.status(200).send({ private_key: keys[0].private_key });
      }
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};
