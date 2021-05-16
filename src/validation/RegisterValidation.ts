import { body, query, ValidationChain } from "express-validator";

const RegisterValidation = {
  availableEmail: (): Array<ValidationChain> => [
    query("email", "email is required!").not().isEmpty().isEmail(),
  ],
  availableUsername: (): Array<ValidationChain> => [
    query("username", "username is required!").not().isEmpty(),
  ],

  register: (): Array<ValidationChain> => {
    return [
      body("email", "email is required!").not().isEmpty().isEmail(),
      body("master_hash", "master hash is required").not().isEmpty(),
      body("sym_key", "sym_key is required!").not().isEmpty(),
      body("inhibit_login", "master hash is required").toBoolean(),
    ];
  },
};

export default RegisterValidation;
