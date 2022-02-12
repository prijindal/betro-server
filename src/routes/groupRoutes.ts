/* /api/groups */
import { Router } from "express";
import { Service } from "typedi";
import { GroupController } from "../controller/GroupController";
import GroupValidation from "../validation/GroupValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";

@Service()
export class GroupRouter {
  public router: Router;

  constructor(private groupController: GroupController) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get("/", expressWrapper(this.groupController.GetGroupsHandler));
    this.router.post(
      "/",
      GroupValidation.create(),
      validateRequest,
      expressWrapper(this.groupController.PostGroupHandler)
    );
    this.router.delete(
      "/:group_id",
      GroupValidation.delete(),
      validateRequest,
      expressWrapper(this.groupController.DeleteGroupHandler)
    );
  }
}
