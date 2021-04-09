import { body, query, ValidationChain } from "express-validator";

const RegisterValidation = {
  available: (): Array<ValidationChain> => [
    query("email", "email is required!").not().isEmpty().isEmail(),
  ],

  register: (): Array<ValidationChain> => {
    return [
      body("email", "email is required!").not().isEmpty().isEmail(),
      body("master_hash", "master hash is required").not().isEmpty(),
      body("inhibit_login", "master hash is required").toBoolean(),
    ];
  },
};

export default RegisterValidation;