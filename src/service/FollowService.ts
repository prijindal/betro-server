import postgres from "../db/postgres";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";

export const checkFollow = async (
  user_id: string,
  followee_id: string
): Promise<{ id: string; is_approved: boolean }> => {
  const queryResult = await postgres<FollowPostgres>("group_follow_approvals")
    .select("id", "is_approved")
    .where({ user_id, followee_id });
  if (queryResult.length == 0) {
    return null;
  }
  return queryResult[0];
};

export const createFollow = async (
  user_id: string,
  followee_id: string
): Promise<FollowPostgres> => {
  const queryResult = await postgres<FollowPostgres>("group_follow_approvals")
    .insert({ user_id, followee_id })
    .returning("*");
  if (queryResult.length == 0) {
    throw new Error();
  }
  return queryResult[0];
};

export const fetchPendingApprovalsCount = async (
  user_id: string,
  after_id?: Date
): Promise<number> => {
  const query = postgres<FollowPostgres>("group_follow_approvals")
    .count<Array<Record<"count", string>>>("id")
    .where({ followee_id: user_id, is_approved: false });
  if (after_id != null) {
    query.andWhere("created_at", "<", after_id);
  }
  const queryResult = await query;
  return parseInt(queryResult[0].count, 10);
};

export const fetchPendingApprovals = async (
  user_id: string,
  limit: number = 50,
  after_id?: Date
): Promise<Array<FollowPostgres>> => {
  const query = postgres<FollowPostgres>("group_follow_approvals")
    .where({ followee_id: user_id, is_approved: false })
    .limit(limit);
  if (after_id != null) {
    query.andWhere("created_at", "<", after_id);
  }
  return query.select("*");
};

export const fetchFollowerCount = async (
  user_id: string,
  after_id?: Date
): Promise<number> => {
  const query = postgres<FollowPostgres>("group_follow_approvals")
    .count<Array<Record<"count", string>>>("id")
    .where({ followee_id: user_id, is_approved: true });
  if (after_id != null) {
    query.andWhere("created_at", "<", after_id);
  }
  const queryResult = await query;
  return parseInt(queryResult[0].count, 10);
};

export const fetchFollowers = async (
  user_id: string,
  limit: number = 50,
  after_id?: Date
): Promise<Array<FollowPostgres>> => {
  const query = postgres<FollowPostgres>("group_follow_approvals")
    .where({ followee_id: user_id, is_approved: true })
    .limit(limit);
  if (after_id != null) {
    query.andWhere("created_at", "<", after_id);
  }
  return query.select("*");
};

export const fetchFolloweesCount = async (
  user_id: string,
  after_id?: Date
): Promise<number> => {
  const query = postgres<FollowPostgres>("group_follow_approvals")
    .count<Array<Record<"count", string>>>("id")
    .where({ user_id });
  if (after_id != null) {
    query.andWhere("created_at", "<", after_id);
  }
  const queryResult = await query;
  return parseInt(queryResult[0].count, 10);
};

export const fetchFollowees = async (
  user_id: string,
  limit: number = 50,
  after_id?: Date
): Promise<Array<FollowPostgres>> => {
  const query = postgres<FollowPostgres>("group_follow_approvals")
    .where({ user_id })
    .limit(limit);
  if (after_id != null) {
    query.andWhere("created_at", "<", after_id);
  }
  return query.select("*");
};

export const fetchPendingApproval = async (
  user_id: string,
  follow_id: string
): Promise<{ is_approved: boolean; id: string; user_id: string } | null> => {
  const queryResult = await postgres<FollowPostgres>("group_follow_approvals")
    .where({ followee_id: user_id, id: follow_id })
    .select("id", "is_approved", "user_id");
  if (queryResult.length == 0) {
    return null;
  }
  return queryResult[0];
};

export const approveFollowRequest = async (
  user_id: string,
  follow_id: string,
  group_id: string,
  group_sym_key: string,
  user_sym_key: string
) => {
  const queryResult = await postgres<FollowPostgres>("group_follow_approvals")
    .where({ followee_id: user_id, id: follow_id })
    .update({ is_approved: true, group_id, group_sym_key, user_sym_key });
  return queryResult == 1;
};

export const fetchUserGroupsFollows = async (
  user_id: string,
  group_ids: Array<string>
) => {
  const queryResult = postgres<FollowPostgres>("group_follow_approvals")
    .whereIn("group_id", group_ids)
    .andWhere({ user_id });
  return queryResult;
};
