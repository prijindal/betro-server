import { body, query } from "express-validator";

const RegisterValidation = {
  available: () => [
      query("email", "email is required!").not().isEmpty().isEmail(),
    ],

  register: () => {
    return [
      body('name', 'Name is Mandatory Parameter Missing.').not().isEmpty()
    ]
  }
}

export default RegisterValidation;
