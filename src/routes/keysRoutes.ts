/* /api/keys */
import { Router } from "express";
import { expressWrapper } from "../controller/expressHelper";
import {
  GetKeysHandler,
  GetEcdhKeysHandler,
  CreateEcdhKeyHandler,
  CreateEcdhKeysHandler,
} from "../controller/KeyController";

const router = Router();

router.get(
  "/",
  expressWrapper<
    {},
    { private_key: string; sym_key: string },
    {},
    { include_echd_counts?: boolean }
  >(GetKeysHandler)
);

router.get("/ecdh", expressWrapper(GetEcdhKeysHandler));
router.post("/ecdh", expressWrapper(CreateEcdhKeyHandler));
router.post("/ecdh/upload", expressWrapper(CreateEcdhKeysHandler));

export default router;
