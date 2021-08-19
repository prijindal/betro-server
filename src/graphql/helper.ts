import { Request } from "express";
import { GraphQLFieldResolver } from "graphql";
import { parseUserFromReq } from "../middleware/authAccesstoken";
import { userAccessed } from "../service/AccountService";
import { AppHandlerFunction } from "../controller/expressHelper";

export const userAccessHandler = async (req: Request) => {
  const { response, error } = await parseUserFromReq(req);
  if (error != null || response == null) {
    throw new Error(error);
  }
  const { user_id, access_token_id } = response;
  userAccessed(access_token_id);
  return user_id;
};

export const graphqlWrapper = <ReqBody, Res>(
  fn: AppHandlerFunction<ReqBody & { user_id?: string }, Res>
): GraphQLFieldResolver<null, Request, ReqBody> => {
  const resolveFunction: GraphQLFieldResolver<null, Request, ReqBody> = async (
    source,
    args,
    req
  ) => {
    const user_id = await userAccessHandler(req);
    const { response, error } = await fn({ ...args, user_id });
    if (error != null || response == null) {
      throw new Error(error.message);
    }
    return response;
  };
  return resolveFunction;
};
