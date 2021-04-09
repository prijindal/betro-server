import { body, ValidationChain } from "express-validator";

const LoginValidation = {
  login: (): Array<ValidationChain> => {
    return [
      body("email", "email is required!").not().isEmpty().isEmail(),
      body("master_hash", "master hash is required").not().isEmpty(),
    ];
  },
};

export default LoginValidation;
