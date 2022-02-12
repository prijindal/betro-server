/* /api/register */
import { Router, Request, Response } from "express";
import { Service } from "typedi";
import RegisterValidation from "../validation/RegisterValidation";
import { RegisterController } from "../controller/RegisterController";
import { validateRequest } from "../middleware/validateRequest";
import { expressAppHandler, expressWrapper } from "../controller/expressHelper";
import { RegisterBody } from "../service/RegisterService";

@Service()
export class RegisterRouter {
  public router: Router;

  constructor(private registerController: RegisterController) {
    this.router = Router();
    this.routes();
  }

  register = (req: Request<{}, {}, RegisterBody, {}>, res: Response) =>
    expressAppHandler(req, res, (reqBody: RegisterBody) =>
      this.registerController.registerUserHandler({
        ...reqBody,
        user_agent: req.headers["user-agent"],
      })
    );

  public routes() {
    this.router.get(
      "/available/email",
      RegisterValidation.availableEmail(),
      validateRequest,
      expressWrapper<{}, { available: boolean }, {}, { email: string }>(
        this.registerController.isAvailabeEmailHandler
      )
    );
    this.router.get(
      "/available/username",
      RegisterValidation.availableUsername(),
      validateRequest,
      expressWrapper<{}, { available: boolean }, {}, { username: string }>(
        this.registerController.isAvailabeUsernameHandler
      )
    );
    this.router.post(
      "/",
      RegisterValidation.register(),
      validateRequest,
      this.register
    );
  }
}
