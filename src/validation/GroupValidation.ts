import { body, ValidationChain } from "express-validator";

const GroupValidation = {
  create: (): Array<ValidationChain> => [
    body("sym_key", "sym_key is required!").not().isEmpty(),
    body("name", "name is required!").not().isEmpty(),
  ],
  delete: (): Array<ValidationChain> => [
    body("group_id", "group_id is required!").not().isEmpty(),
  ],
};

export default GroupValidation;
