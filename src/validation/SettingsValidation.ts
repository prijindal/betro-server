import { body, ValidationChain } from "express-validator";

const SettingsValidation = {
  saveNotification: (): Array<ValidationChain> => [
    body("action", "action is required!").not().isEmpty().isString(),
    body("enabled", "enabled is required!").not().isEmpty().isBoolean(),
  ],
};

export default SettingsValidation;
