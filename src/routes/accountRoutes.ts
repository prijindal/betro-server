/* /api/account */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import { whoAmi, getKeys } from "../controller/LoginController";

const router = Router();

router.get("/whoami", authAccesstoken, whoAmi);
router.get("/keys", authAccesstoken, getKeys);

export default router;
