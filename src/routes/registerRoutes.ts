/* /api/register */
import { Router } from "express";
import RegisterValidation from "../validation/RegisterValidation";
import {availableUser,registerUser} from "../controller/UserController"
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get(
  "/available",
  RegisterValidation.available(),
  validateRequest,
  availableUser
);

router.post(
  "/",
  RegisterValidation.register(),
  validateRequest,
  registerUser
);

export default router;
