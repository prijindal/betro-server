import { param, ValidationChain } from "express-validator";

const UserValidation = {
  profile: (): Array<ValidationChain> => [
    param("username", "user_id is required!").not().isEmpty(),
  ],
  posts: (): Array<ValidationChain> => [
    param("username", "user_id is required!").not().isEmpty(),
  ],
};

export default UserValidation;
