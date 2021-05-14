import { body, ValidationChain } from "express-validator";

const GroupValidation = {
  follow: (): Array<ValidationChain> => [
    body("followee_id", "followee_id is required!").not().isEmpty(),
    body("own_key_id", "own_key_id is required!").not().isEmpty(),
  ],
  approve: (): Array<ValidationChain> => [
    body("follow_id", "follow_id is required!").not().isEmpty(),
    body("encrypted_group_sym_key", "encrypted_group_sym_key is required!")
      .not()
      .isEmpty(),
    body("group_id", "group_id is required!").not().isEmpty(),
    body("own_key_id", "own_key_id is required!").not().isEmpty(),
  ],
};

export default GroupValidation;
