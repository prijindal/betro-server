/* /api/account */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import { whoAmi } from "../controller/LoginController";

const router = Router();

router.get("/whoami", authAccesstoken, whoAmi);

export default router;