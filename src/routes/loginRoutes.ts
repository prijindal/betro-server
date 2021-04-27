/* /api/login */
import { Router, Response, Request } from "express";
import LoginValidation from "../validation/LoginValidation";
import { LoginUserHandler } from "../controller/LoginController";
import { validateRequest } from "../middleware/validateRequest";
import { expressAppHandler } from "../controller/expressHelper";
import { LoginBody } from "../service/LoginService";

const router = Router();

router.post(
  "/",
  LoginValidation.login(),
  validateRequest,
  (req: Request<{}, {}, LoginBody, {}>, res: Response) =>
    expressAppHandler(req, res, (reqBody: LoginBody) =>
      LoginUserHandler({ ...reqBody, user_agent: req.headers["user-agent"] })
    )
);

export default router;
