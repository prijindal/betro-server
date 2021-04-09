/* /api/register */
import { Router } from "express";
import RegisterValidation from "../validation/RegisterValidation";
import {availableUser} from "../controller/UserController"

const router = Router();

router.get(
  "/available",
  RegisterValidation.available(),
  availableUser
);

router.post("/", function(req, res,next) {
  next();
});

export default router;
