/* /api/groups */
import { Router } from "express";
import {
  getGroups,
  postGroup,
  deleteGroup,
} from "../controller/GroupController";
import GroupValidation from "../validation/GroupValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", getGroups);
router.post("/", GroupValidation.create(), validateRequest, postGroup);
router.delete(
  "/:group_id",
  GroupValidation.delete(),
  validateRequest,
  deleteGroup
);

export default router;
