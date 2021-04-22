/* /api/account */
import { Router } from "express";
import AccountValidation from "../validation/AccountValidation";
import {
  whoAmi,
  getKeys,
  getProfilePicture,
  getProfile,
  postProfile,
  putProfile,
  fetchCounts,
} from "../controller/LoginController";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.get("/whoami", whoAmi);
router.get("/profile_picture", getProfilePicture);
router.get("/keys", getKeys);
router.get("/profile", getProfile);
router.post(
  "/profile",
  AccountValidation.saveProfile(),
  validateRequest,
  postProfile
);
router.put("/profile", putProfile);
router.get("/count", fetchCounts);

export default router;
