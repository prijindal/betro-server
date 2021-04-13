/* /api/groups */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import {
  getGroups,
  postGroup,
  deleteGroup,
} from "../controller/GroupController";
import GroupValidation from "../validation/GroupValidation";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/", authAccesstoken, getGroups);
router.post(
  "/",
  authAccesstoken,
  GroupValidation.create(),
  validateRequest,
  postGroup
);
router.delete(
  "/:group_id",
  authAccesstoken,
  GroupValidation.delete(),
  validateRequest,
  deleteGroup
);

export default router;
