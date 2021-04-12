import { param, ValidationChain } from "express-validator";

const UserValidation = {
  profile: (): Array<ValidationChain> => [
    param("user_id", "user_id is required!").not().isEmpty().isEmail(),
  ],
  posts: (): Array<ValidationChain> => [
    param("user_id", "user_id is required!").not().isEmpty().isEmail(),
  ],
};

export default UserValidation;
