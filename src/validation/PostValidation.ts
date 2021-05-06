import { body, param, ValidationChain } from "express-validator";

const PostValidation = {
  create: (): Array<ValidationChain> => [
    body("group_id", "group_id is required!").not().isEmpty(),
  ],
  post: (): Array<ValidationChain> => [
    param("id", "id is required!").not().isEmpty().isUUID(),
  ],
};

export default PostValidation;
