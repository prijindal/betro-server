import { Request, Response } from "express";
import { logger, ENVIRONMENT } from "../config";
import { ErrorDataType } from "../constant/ErrorData";

export type AppHandlerFunction<ReqParams extends {}, ResBody> = (
  req: ReqParams
) => Promise<{ response: ResBody | null; error: ErrorDataType | null }>;

export const expressWrapper = <
  P extends {} = {},
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
  P extends {} = {},
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
  const loggableRequest = {
    // path: req.path,
    // params: req.params,
    // query: req.query,
    // body: req.body,
    // ip: req.ip,
    // headers: req.headers,
    // locals: res.locals,
  };
  fn(reqParams)
    .then(({ error, response }) => {
      if (error == null) {
        logger.trace({ req: loggableRequest, response });
        res.status(200).send(response);
      } else {
        logger.debug({ req: loggableRequest, error });
        res.status(error.status).send(error);
      }
    })
    .catch((e) => {
      logger.error({ req: loggableRequest, error: e });
      res.status(500).send({
        status: 500,
        message:
          ENVIRONMENT === "development" ? e.toString() : "Some error occurred",
        data: ENVIRONMENT === "development" ? e : null,
      });
    });
};
