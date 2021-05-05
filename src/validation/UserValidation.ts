import { param, query, ValidationChain } from "express-validator";

const UserValidation = {
  profile: (): Array<ValidationChain> => [
    param("username", "user_id is required!").not().isEmpty(),
  ],
  posts: (): Array<ValidationChain> => [
    param("username", "user_id is required!").not().isEmpty(),
  ],
  search: (): Array<ValidationChain> => [
    query("query", "query is required").not().isEmpty(),
  ],
};

export default UserValidation;
