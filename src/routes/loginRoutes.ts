/* /api/login */
import { Router } from "express";
import LoginValidation from "../validation/LoginValidation";
import { loginUser } from "../controller/UserController";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.post("/", LoginValidation.login(), validateRequest, loginUser);

export default router;
