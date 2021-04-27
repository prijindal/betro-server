/* /api/groups */
import { Router } from "express";
import {
  GetGroupsHandler,
  PostGroupHandler,
  DeleteGroupHandler,
} from "../controller/GroupController";
import GroupValidation from "../validation/GroupValidation";
import { validateRequest } from "../middleware/validateRequest";
import { expressWrapper } from "../controller/expressHelper";

const router = Router();

router.get("/", expressWrapper(GetGroupsHandler));
router.post(
  "/",
  GroupValidation.create(),
  validateRequest,
  expressWrapper(PostGroupHandler)
);
router.delete(
  "/:group_id",
  GroupValidation.delete(),
  validateRequest,
  expressWrapper(DeleteGroupHandler)
);

export default router;
