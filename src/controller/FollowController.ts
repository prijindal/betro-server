import { Request, Response } from "express";
import { createRsaKeyPair } from "../service/KeyService";
import { checkFollow, createFollow } from "../service/FollowService";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import { FollowRequest } from "../interfaces/requests/FollowRequest";
import { FollowResponse } from "../interfaces/responses/FollowResponse";
import { userEmail } from "../service/AccountService";

export const followUser = async (
  req: Request<null, null, FollowRequest>,
  res: Response<FollowResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  const followee_id = req.body.followee_id;
  const public_key = req.body.public_key;
  const private_key = req.body.private_key;
  try {
    const followeeEmail = userEmail(followee_id);
    if (followeeEmail == null) {
      res.status(404).send(errorResponse(404, "User does not exist"));
    } else {
      const isFollowing = await checkFollow(user_id, followee_id);
      if (isFollowing) {
        res.status(411).send(errorResponse(411, "Already Following"));
      } else {
        const key_id = await createRsaKeyPair(user_id, public_key, private_key);
        const followResponse = await createFollow(user_id, followee_id, key_id);
        res.status(200).send({
          public_key: public_key,
          private_key: private_key,
          is_approved: followResponse.is_approved,
          id: followResponse.user_id,
        });
      }
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};
