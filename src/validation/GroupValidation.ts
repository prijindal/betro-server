import { body, ValidationChain } from "express-validator";

const GroupValidation = {
  create: (): Array<ValidationChain> => {
    return [
      body("sym_key", "sym_key is required!").not().isEmpty(),
      body("name", "name is required!").not().isEmpty(),
    ];
  },
};

export default GroupValidation;
