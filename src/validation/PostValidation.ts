import { body, ValidationChain } from "express-validator";

const PostValidation = {
  create: (): Array<ValidationChain> => [
    body("group_id", "group_id is required!").not().isEmpty(),
  ],
};

export default PostValidation;
