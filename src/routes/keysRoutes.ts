/* /api/keys */
import { Router } from "express";
import { expressWrapper } from "../controller/expressHelper";
import {
  GetKeysHandler,
  GetEcdhKeysHandler,
  GetEcdhUserKeyHandler,
  CreateEcdhKeyHandler,
  CreateEcdhKeysHandler,
} from "../controller/KeyController";

const router = Router();

router.get(
  "/",
  expressWrapper<
    {},
    { sym_key: string },
    {},
    { include_echd_counts?: boolean }
  >(GetKeysHandler)
);

router.get("/ecdh", expressWrapper(GetEcdhKeysHandler));
router.get("/ecdh/user/:id", expressWrapper(GetEcdhUserKeyHandler));
router.post("/ecdh", expressWrapper(CreateEcdhKeyHandler));
router.post("/ecdh/upload", expressWrapper(CreateEcdhKeysHandler));

export default router;
