/* /api/keys */
import { Router } from "express";
import { Service } from "typedi";
import { expressWrapper } from "../controller/expressHelper";
import { KeyController } from "../controller/KeyController";

@Service()
export class KeysRouter {
  public router: Router;

  constructor(private keyController: KeyController) {
    this.router = Router();
    this.routes();
  }
  public routes() {
    this.router.get(
      "/",
      expressWrapper<
        {},
        { sym_key: string },
        {},
        { include_echd_counts?: boolean }
      >(this.keyController.getKeysHandler)
    );

    this.router.get(
      "/ecdh",
      expressWrapper(this.keyController.getEcdhKeysHandler)
    );
    this.router.get(
      "/ecdh/user/:id",
      expressWrapper(this.keyController.getEcdhUserKeyHandler)
    );
    this.router.post(
      "/ecdh",
      expressWrapper(this.keyController.createEcdhKeyHandler)
    );
    this.router.post(
      "/ecdh/upload",
      expressWrapper(this.keyController.createEcdhKeysHandler)
    );
  }
}
