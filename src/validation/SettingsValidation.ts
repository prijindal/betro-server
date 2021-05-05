import { body, ValidationChain } from "express-validator";

const SettingsValidation = {
  saveSettings: (): Array<ValidationChain> => [
    body("type", "action is required!").not().isEmpty().isString(),
    body("enabled", "enabled is required!").not().isEmpty().isBoolean(),
  ],
};

export default SettingsValidation;
