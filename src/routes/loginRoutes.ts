/* /api/login */
import { Router, Response, Request } from "express";
import { Service } from "typedi";
import LoginValidation from "../validation/LoginValidation";
import { LoginController } from "../controller/LoginController";
import { validateRequest } from "../middleware/validateRequest";
import { LoginBody } from "../service/LoginService";

@Service()
export class LoginRouter {
  public router: Router;

  constructor(private loginController: LoginController) {
    this.router = Router();
    this.routes();
  }

  login = async (
    req: Request<{}, {}, LoginBody, { set_cookie: string }>,
    res: Response
  ) => {
    const { response, error } = await this.loginController.loginUserHandler({
      ...req.body,
      user_agent: req.headers["user-agent"],
    });
    if (error != null) {
      res.status(error.status).send(error);
    } else {
      const setCookie = req.query.set_cookie === "true";
      if (setCookie == false) {
        res.status(200).send(response);
      } else {
        res.cookie("token", response.token, {
          maxAge: 24 * 60 * 1000,
          httpOnly: true,
        });
        res.status(200).send({});
      }
    }
  };

  public routes() {
    this.router.post("/", LoginValidation.login(), validateRequest, this.login);
  }
}
