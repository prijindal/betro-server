import { Request, Response } from "express";
import postgres from "../db/postgres";
import { getRsaKeys } from "../service/KeyService";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import { FollowRequest } from "../interfaces/requests/FollowRequest";
import { FollowResponse } from "../interfaces/responses/FollowResponse";
import { ApprovalResponse } from "../interfaces/responses/ApprovalResponse";
import { ApproveRequest } from "../interfaces/requests/ApproveRequest";
import { fetchGroups, fetchUserGroup } from "../service/GroupService";
import { FollowerResponse } from "../interfaces/responses/FollowerResponse";
import { fetchUsers } from "../service/UserService";
import { FolloweeResponse } from "../interfaces/responses/FolloweeResponse";
import { createUserNotification } from "../service/NotificationService";
import { checkUserNotificationSetting } from "../service/SettingsService";
import { PaginatedResponse } from "../interfaces/responses/PaginatedResponse";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";
import { UserPaginationWrapper } from "../service/helper";
import { UserPostgres } from "../interfaces/database/UserPostgres";

export const followUser = async (
  req: Request<null, null, FollowRequest>,
  res: Response<FollowResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  const followee_username = req.body.followee_username;
  try {
    const followeeUser = await postgres<UserPostgres>("users")
      .select("*")
      .where({ username: followee_username })
      .first();
    if (followeeUser == null) {
      res.status(404).send(errorResponse(404, "User does not exist"));
    } else {
      const isFollowing = await postgres<FollowPostgres>(
        "group_follow_approvals"
      )
        .select("is_approved")
        .where({ user_id, followee_id: followeeUser.id })
        .first();
      if (isFollowing != null) {
        if (isFollowing.is_approved) {
          res.status(411).send(errorResponse(411, "Already Following"));
        } else {
          res.status(411).send(errorResponse(411, "Waiting for approval"));
        }
      } else {
        const followResponse = await postgres<FollowPostgres>(
          "group_follow_approvals"
        ).insert({ user_id, followee_id: followeeUser.id }, "*");
        if (followResponse.length == 0) {
          throw new Error();
        }
        const users = await fetchUsers([user_id]);
        if (users.length == 1) {
          const user = users[0];
          const notificationEnabled = await checkUserNotificationSetting(
            followeeUser.id,
            "on_followed"
          );
          if (notificationEnabled) {
            await createUserNotification(
              followeeUser.id,
              "on_followed",
              `${user.username} asked to follow you`,
              { username: user.username }
            );
          }
        }
        res.status(200).send({
          is_approved: followResponse[0].is_approved,
          id: followResponse[0].user_id,
        });
      }
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const getApprovals = async (
  req: Request<null, null, null, { after: string; limit: string }>,
  res: Response<PaginatedResponse<ApprovalResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const {
      data,
      limit,
      after,
      total,
      next,
    } = await UserPaginationWrapper<FollowPostgres>(
      "group_follow_approvals",
      { followee_id: user_id, is_approved: false },
      req.query.limit,
      req.query.after
    );
    const user_ids = data.map((a) => a.user_id);
    const users = await fetchUsers(user_ids);
    const key_ids = users.map((a) => a.key_id);
    const rsa_keys = await getRsaKeys(key_ids, false);
    const response: Array<ApprovalResponse> = [];
    data.forEach((approval) => {
      const user = users.find((a) => a.id == approval.user_id);
      if (user != null) {
        const rsa_key = rsa_keys.find((a) => a.id == user.key_id);
        if (rsa_key != null) {
          response.push({
            id: approval.id,
            username: user.username,
            follower_id: approval.user_id,
            public_key: rsa_key.public_key,
            created_at: approval.created_at,
          });
        }
      }
    });
    res.status(200).send({
      data: response,
      limit,
      total,
      after,
      next,
    });
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const getFollowers = async (
  req: Request<null, null, null, { after: string; limit: string }>,
  res: Response<PaginatedResponse<FollowerResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const {
      data,
      limit,
      after,
      total,
      next,
    } = await UserPaginationWrapper<FollowPostgres>(
      "group_follow_approvals",
      { followee_id: user_id, is_approved: true },
      req.query.limit,
      req.query.after
    );
    const group_ids = data.map((a) => a.group_id);
    const groups = await fetchGroups(group_ids);
    const follower_ids = data.map((a) => a.user_id);
    const followers = await fetchUsers(follower_ids);
    const response: Array<FollowerResponse> = [];
    data.forEach((follow) => {
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
    res.status(200).send({ data: response, limit, after, total, next });
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const getFollowees = async (
  req: Request<null, null, null, { after: string; limit: string }>,
  res: Response<PaginatedResponse<FolloweeResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const {
      data,
      limit,
      after,
      total,
      next,
    } = await UserPaginationWrapper<FollowPostgres>(
      "group_follow_approvals",
      { user_id },
      req.query.limit,
      req.query.after
    );
    const followee_ids = data.map((a) => a.followee_id);
    const followees = await fetchUsers(followee_ids);
    const response: Array<FolloweeResponse> = [];
    data.forEach((follow) => {
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
    res.status(200).send({ data: response, limit, after, total, next });
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
  const group_sym_key = req.body.group_sym_key;
  const user_sym_key = req.body.user_sym_key;
  const group_id = req.body.group_id;
  try {
    const approval = await postgres<FollowPostgres>("group_follow_approvals")
      .where({ followee_id: user_id, id: follow_id })
      .select("id", "is_approved", "user_id")
      .first();
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
          const approved = await postgres<FollowPostgres>(
            "group_follow_approvals"
          )
            .where({ followee_id: user_id, id: follow_id })
            .update({
              is_approved: true,
              group_id,
              group_sym_key,
              user_sym_key,
            });
          const users = await fetchUsers([user_id]);
          if (users.length == 1) {
            const user = users[0];
            const notificationEnabled = await checkUserNotificationSetting(
              approval.user_id,
              "on_approved"
            );
            if (notificationEnabled) {
              await createUserNotification(
                approval.user_id,
                "on_approved",
                `${user.username} has approved your follow request`,
                { username: user.username }
              );
            }
          }
          res.status(200).send({ approved: approved === 1 });
        }
      }
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
