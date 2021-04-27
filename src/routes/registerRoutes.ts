/* /api/register */
import { Router, Request, Response } from "express";
import RegisterValidation from "../validation/RegisterValidation";
import {
  RegisterUserHandler,
  IsAvailabeUsernameHandler,
  IsAvailabeEmailHandler,
} from "../controller/RegisterController";
import { validateRequest } from "../middleware/validateRequest";
import { expressAppHandler, expressWrapper } from "../controller/expressHelper";
import { RegisterBody } from "../service/RegisterService";

const router = Router();

router.get(
  "/available/email",
  RegisterValidation.availableEmail(),
  validateRequest,
  expressWrapper<{}, { available: boolean }, {}, { email: string }>(
    IsAvailabeEmailHandler
  )
);

router.get(
  "/available/username",
  RegisterValidation.availableUsername(),
  validateRequest,
  expressWrapper<{}, { available: boolean }, {}, { username: string }>(
    IsAvailabeUsernameHandler
  )
);

router.post(
  "/",
  RegisterValidation.register(),
  validateRequest,
  (req: Request<{}, {}, RegisterBody, {}>, res: Response) =>
    expressAppHandler(req, res, (reqBody: RegisterBody) =>
      RegisterUserHandler({ ...reqBody, user_agent: req.headers["user-agent"] })
    )
);

export default router;
