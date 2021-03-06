import { Request, Response, NextFunction } from "express";
import { isEmpty, trim } from "lodash";
import { Service } from "typedi";
import { LoginService } from "../service/LoginService";
import { errorResponse } from "../util/responseHandler";

@Service()
export class AuthAccessTokenMiddleware {
  constructor(private loginService: LoginService) {}

  parseUserFromToken = async (
    token: string
  ): Promise<{
    response?: { user_id: string; access_token_id: string };
    error?: string;
  }> => {
    const jwt = trim(token);
    try {
      const { user_id, access_token_id } = await this.loginService.parseJwt(
        jwt
      );
      if (isEmpty(user_id)) {
        return { error: "Invalid jwt token" };
      }
      return { response: { user_id, access_token_id } };
    } catch (e) {
      return { error: "Invalid jwt token" };
    }
  };

  parseUserFromReq = async (
    req: Request
  ): Promise<{
    response?: { user_id: string; access_token_id: string };
    error?: string;
  }> => {
    let authorization = req.headers.authorization;
    const cookie = req.cookies["token"];
    if (cookie != null && cookie.length > 0) {
      authorization = `Bearer ${cookie}`;
    }
    if (!authorization || !authorization.startsWith("Bearer")) {
      return {
        error: "Invalid Authorization Header",
      };
    }
    return this.parseUserFromToken(authorization.split("Bearer")[1]);
  };

  authAccesstoken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response> => {
    const { response, error } = await this.parseUserFromReq(req);
    if (error != null || response == null) {
      return res.status(401).send(errorResponse(401, error));
    }
    const { user_id, access_token_id } = response;
    res.locals.user_id = user_id;
    this.loginService.userAccessed(access_token_id);
    next();
  };
}
