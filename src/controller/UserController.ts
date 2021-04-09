import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import { isEmpty } from "lodash";
import { errorResponse } from "../util/responseHandler";
import {
  isEmailAvailable,
  RegisterBody,
  createUser,
} from "../service/RegisterService";
import {
  LoginBody,
  checkUserCredentials,
  createAccessToken
} from "../service/LoginService";

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
      const response = await createUser(req.body);
      res.status(200).send(response);
    } else {
      res.status(400).send(errorResponse(400, "Email is not available"));
    }
  } catch (e) {
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
    const verifiedObject = await checkUserCredentials(req.body.email, req.body.master_hash);
    if(verifiedObject.isValid == false) {
      res.status(403).send(errorResponse(403, "Invalid Credentials"));
    } else {
      const user_id = verifiedObject.user_id;
      let device_id = req.body.device_id;
      if(isEmpty(device_id)) {
        device_id = uuidv4();
      }    
      const access_token = await createAccessToken(user_id, device_id,req.body.initial_device_display_name);
      // Create access token and send
      res.status(200).send({user_id, access_token,device_id});
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
    next(e);
  }
};
