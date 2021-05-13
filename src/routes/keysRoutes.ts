/* /api/keys */
import { Router } from "express";
import { expressWrapper } from "../controller/expressHelper";
import { GetKeysHandler } from "../controller/KeyController";

const router = Router();

router.get(
  "/",
  expressWrapper<
    {},
    { private_key: string; sym_key: string },
    {},
    { include_echd?: boolean }
  >(GetKeysHandler)
);

export default router;
