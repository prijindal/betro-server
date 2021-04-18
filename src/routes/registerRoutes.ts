/* /api/register */
import { Router } from "express";
import RegisterValidation from "../validation/RegisterValidation";
import {
  availableUsername,
  availableEmail,
  registerUser,
} from "../controller/LoginController";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get(
  "/available/email",
  RegisterValidation.availableEmail(),
  validateRequest,
  availableEmail
);

router.get(
  "/available/username",
  RegisterValidation.availableUsername(),
  validateRequest,
  availableUsername
);

router.post("/", RegisterValidation.register(), validateRequest, registerUser);

export default router;
