import { Request,Response,NextFunction } from "express";
import {validationResult} from "express-validator"
import { errorResponse } from "../util/responseHandler";

export const validateRequest = (req:Request, res:Response, next:NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array({onlyFirstError: true});
    const response = errorResponse(402, validationErrors[0].msg);
    return res.status(402).send(response);
  }
  next();
}
