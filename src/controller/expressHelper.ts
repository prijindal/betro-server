import { ParamsDictionary } from "express-serve-static-core";
import { Request, Response } from "express";
import { logger } from "../config";
import { ErrorDataType } from "../constant/ErrorData";

export type AppHandlerFunction<ReqParams extends {}, ResBody> = (
  req: ReqParams
) => Promise<{ response: ResBody | null; error: ErrorDataType | null }>;

export const expressWrapper = <
  P extends {} = ParamsDictionary,
  ResBody extends {} = {},
  ReqBody extends {} = {},
  ReqQuery extends {} = {}
>(
  fn: AppHandlerFunction<P & ReqBody & ReqQuery, ResBody>
) => {
  return function (
    req: Request<P, ResBody, ReqBody, ReqQuery, { user_id?: string }>,
    res: Response
  ) {
    return expressAppHandler(req, res, fn);
  };
};

export const expressAppHandler = <
  P extends {} = ParamsDictionary,
  ResBody extends {} = {},
  ReqBody extends {} = {},
  ReqQuery extends {} = {}
>(
  req: Request<P, ResBody, ReqBody, ReqQuery, { user_id?: string }>,
  res: Response,
  fn: AppHandlerFunction<P & ReqBody & ReqQuery, ResBody>
): void => {
  const reqParams = {
    ...req.params,
    ...req.query,
    ...req.body,
    user_id: res.locals.user_id,
  };
  fn(reqParams)
    .then(({ error, response }) => {
      if (error == null) {
        res.status(200).send(response);
      } else {
        res.status(error.status).send(error);
      }
    })
    .catch((e) => {
      logger.error(e);
      res.status(500).send({ status: 500, message: "Some error occurred" });
    });
};
