import { Request, Response } from "express";
import { createRsaKeyPair, getRsaKeys } from "../service/KeyService";
import {
  approveFollowRequest,
  checkFollow,
  createFollow,
  fetchFollowees,
  fetchFollowers,
  fetchPendingApproval,
  fetchPendingApprovals,
} from "../service/FollowService";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import { FollowRequest } from "../interfaces/requests/FollowRequest";
import { FollowResponse } from "../interfaces/responses/FollowResponse";
import { userEmail } from "../service/AccountService";
import { ApprovalResponse } from "../interfaces/responses/ApprovalResponse";
import { ApproveRequest } from "../interfaces/requests/ApproveRequest";
import { fetchGroups, fetchUserGroup } from "../service/GroupService";
import { FollowerResponse } from "../interfaces/responses/FollowerResponse";
import { fetchUsers } from "../service/UserService";
import { FolloweeResponse } from "../interfaces/responses/FolloweeResponse";

export const followUser = async (
  req: Request<null, null, FollowRequest>,
  res: Response<FollowResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  const followee_id = req.body.followee_id;
  try {
    const followeeEmail = userEmail(followee_id);
    if (followeeEmail == null) {
      res.status(404).send(errorResponse(404, "User does not exist"));
    } else {
      const isFollowing = await checkFollow(user_id, followee_id);
      if (isFollowing != null) {
        if (isFollowing.is_approved) {
          res.status(411).send(errorResponse(411, "Already Following"));
        } else {
          res.status(411).send(errorResponse(411, "Waiting for approval"));
        }
      } else {
        const followResponse = await createFollow(user_id, followee_id);
        res.status(200).send({
          is_approved: followResponse.is_approved,
          id: followResponse.user_id,
        });
      }
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const getApprovals = async (
  req: Request,
  res: Response<Array<ApprovalResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const approvals = await fetchPendingApprovals(user_id);
    const user_ids = approvals.map((a) => a.user_id);
    const users = await fetchUsers(user_ids);
    const key_ids = users.map((a) => a.key_id);
    const rsa_keys = await getRsaKeys(key_ids, false);
    const response: Array<ApprovalResponse> = [];
    approvals.forEach((approval) => {
      const user = users.find((a) => a.id == approval.user_id);
      if (user != null) {
        const rsa_key = rsa_keys.find((a) => a.id == user.key_id);
        if (rsa_key != null) {
          response.push({
            id: approval.id,
            username: user.username,
            follower_id: approval.user_id,
            public_key: rsa_key.public_key,
          });
        }
      }
    });
    res.status(200).send(response);
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const getFollowers = async (
  req: Request,
  res: Response<Array<FollowerResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const follows = await fetchFollowers(user_id);
    const group_ids = follows.map((a) => a.group_id);
    const groups = await fetchGroups(group_ids);
    const follower_ids = follows.map((a) => a.user_id);
    const followers = await fetchUsers(follower_ids);
    const response: Array<FollowerResponse> = [];
    follows.forEach((follow) => {
      const group = groups.find((a) => a.id == follow.group_id);
      const follower = followers.find((a) => a.id == follow.user_id);
      if (group != null && follower != null) {
        response.push({
          user_id: follow.user_id,
          follow_id: follow.id,
          username: follower.username,
          group_id: group.id,
          group_name: group.name,
          group_is_default: group.is_default,
        });
      }
    });
    res.status(200).send(response);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const getFollowees = async (
  req: Request,
  res: Response<Array<FolloweeResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const follows = await fetchFollowees(user_id);
    const followee_ids = follows.map((a) => a.followee_id);
    const followees = await fetchUsers(followee_ids);
    const response: Array<FolloweeResponse> = [];
    follows.forEach((follow) => {
      const followee = followees.find((a) => a.id == follow.followee_id);
      if (followee != null) {
        response.push({
          user_id: follow.followee_id,
          follow_id: follow.id,
          username: followee.username,
          is_approved: follow.is_approved,
        });
      }
    });
    res.status(200).send(response);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const approveUser = async (
  req: Request<null, null, ApproveRequest>,
  res: Response<{ approved: boolean } | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  const follow_id = req.body.follow_id;
  const sym_key = req.body.sym_key;
  const group_id = req.body.group_id;
  try {
    const approval = await fetchPendingApproval(user_id, follow_id);
    if (approval == null) {
      res.status(404).send(errorResponse(404, "No follow like this"));
    } else {
      if (approval.is_approved) {
        res.status(404).send(errorResponse(404, "Already approved"));
      } else {
        const group = await fetchUserGroup(user_id, group_id);
        if (group == null) {
          res.status(404).send(errorResponse(404, "Group not found"));
        } else {
          const approved = await approveFollowRequest(
            user_id,
            follow_id,
            group_id,
            sym_key
          );
          res.status(200).send({ approved });
        }
      }
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
