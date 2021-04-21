/* /api/account */
import { Router } from "express";
import { authAccesstoken } from "../middleware/authAccesstoken";
import AccountValidation from "../validation/AccountValidation";
import {
  whoAmi,
  getKeys,
  getProfilePicture,
  getProfile,
  postProfile,
  putProfile,
} from "../controller/LoginController";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/whoami", authAccesstoken, whoAmi);
router.get("/profile_picture", authAccesstoken, getProfilePicture);
router.get("/keys", authAccesstoken, getKeys);
router.get("/profile", authAccesstoken, getProfile);
router.post(
  "/profile",
  authAccesstoken,
  AccountValidation.saveProfile(),
  validateRequest,
  postProfile
);
router.put("/profile", authAccesstoken, putProfile);

export default router;
