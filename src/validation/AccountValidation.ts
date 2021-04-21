import { body, ValidationChain } from "express-validator";

const PostValidation = {
  saveProfile: (): Array<ValidationChain> => [
    body("sym_key", "sym_key is required!").not().isEmpty(),
    body("first_name", "first_name is required!").not().isEmpty(),
    body("last_name", "last_name is required!").not().isEmpty(),
    body("profile_picture", "profile_picture is required!").not().isEmpty(),
  ],
};

export default PostValidation;
