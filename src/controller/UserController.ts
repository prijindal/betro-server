import { NextFunction, Request, Response } from "express";
import { errorResponse } from "../util/responseHandler";
import { isEmailAvailable, RegisterBody, createUser } from "../service/RegisterService";

export const availableUser = async (req: Request<any,any,any, {email: string}>, res: Response, next:NextFunction) => {
  try {
    const queryResult = await isEmailAvailable(req.query.email);
    if(queryResult) {
      res.status(200).send({available: true});
    } else {
      res.status(400).send(errorResponse(400, "Email is not available"));
    }
  } catch(e) {
    res.status(503).send(errorResponse(503));
    next(e);
  }
};

export const registerUser = async (req: Request<any, any, RegisterBody>, res:Response, next:NextFunction) => {
  try {
    const queryResult = await isEmailAvailable(req.body.email);
    if(queryResult) {
      const response = await createUser(req.body);
      res.status(200).send(response);
    } else {
      res.status(400).send(errorResponse(400, "Email is not available"));
    }
  } catch(e) {
    res.status(503).send(errorResponse(503));
    next(e);
  }

}
