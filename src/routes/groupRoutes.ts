/* /api/groups */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import {
  getGroups,
  postGroup,
  deleteGroup,
} from "../controller/GroupController";
import GroupValidation from "../validation/GroupValidation";

const router = Router();

router.get("/", authAccesstoken, getGroups);
router.post("/", authAccesstoken, GroupValidation.create(), postGroup);
router.delete("/:id", authAccesstoken, GroupValidation.delete(), deleteGroup);

export default router;
