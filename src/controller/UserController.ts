import { Request, Response } from "express";
import {validationResult} from "express-validator"
import { errorResponse } from "../util/responseHandler";
import ErrorData from "../constant/ErrorData";
import postgres from "../db/postgres";
import redis from "../db/redis";

export const availableUser = async (req: Request<any,any,any, {email: string}>, res: Response, next:any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(402).send(errorResponse(402));
  }
  try {
    const queryResult = await postgres.query("SELECT id from users WHERE id = $1", [req.query.email]);
    console.log(queryResult);
    next(queryResult);
  } catch(e) {
    res.status(503).send(ErrorData.ERROR_STATUS_ARRAY.find((v => v.status == 503)));
    next(e);
  }
};
