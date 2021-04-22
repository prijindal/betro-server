import postgres from "../db/postgres";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";

export const checkFollow = async (
  user_id: string,
  followee_id: string
): Promise<FollowPostgres> => {
  const queryResult = await postgres.query(
    "SELECT id,is_approved from group_follow_approvals WHERE user_id = $1 AND followee_id = $2",
    [user_id, followee_id]
  );
  if (queryResult.rowCount == 0) {
    return null;
  }
  return queryResult.rows[0];
};

export const createFollow = async (
  user_id: string,
  followee_id: string
): Promise<FollowPostgres> => {
  const queryResult = await postgres.query(
    "INSERT INTO group_follow_approvals(user_id, followee_id) VALUES($1, $2) RETURNING *",
    [user_id, followee_id]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0];
};

export const fetchPendingApprovalsCount = async (
  user_id: string
): Promise<number> => {
  const queryResult = await postgres.query(
    "SELECT count(*) FROM group_follow_approvals WHERE followee_id=$1 AND is_approved=false",
    [user_id]
  );
  return parseInt(queryResult.rows[0].count, 10);
};

export const fetchPendingApprovals = async (
  user_id: string
): Promise<Array<FollowPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM group_follow_approvals WHERE followee_id = $1 AND is_approved=false",
    [user_id]
  );
  return queryResult.rows;
};

export const fetchFollowerCount = async (user_id: string): Promise<number> => {
  const queryResult = await postgres.query(
    "SELECT count(*) FROM group_follow_approvals WHERE followee_id=$1 AND is_approved=true",
    [user_id]
  );
  return parseInt(queryResult.rows[0].count, 10);
};

export const fetchFollowers = async (
  user_id: string
): Promise<Array<FollowPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM group_follow_approvals WHERE followee_id=$1",
    [user_id]
  );
  return queryResult.rows;
};

export const fetchFollowees = async (
  user_id: string
): Promise<Array<FollowPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM group_follow_approvals WHERE user_id=$1",
    [user_id]
  );
  return queryResult.rows;
};

export const fetchPendingApproval = async (
  user_id: string,
  follow_id: string
): Promise<{ is_approved: boolean; id: string; user_id: string } | null> => {
  const queryResult = await postgres.query(
    "SELECT id,is_approved,user_id from group_follow_approvals WHERE followee_id = $1 AND id = $2",
    [user_id, follow_id]
  );
  if (queryResult.rowCount == 0) {
    return null;
  }
  return queryResult.rows[0];
};

export const approveFollowRequest = async (
  user_id: string,
  follow_id: string,
  group_id: string,
  group_sym_key: string,
  user_sym_key: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "UPDATE group_follow_approvals SET is_approved=true,group_id=$1,group_sym_key=$2,user_sym_key=$3 " +
      " WHERE followee_id=$4 AND id=$5",
    [group_id, group_sym_key, user_sym_key, user_id, follow_id]
  );
  return queryResult.rowCount == 1;
};

export const fetchUserGroupsFollows = async (
  user_id: string,
  group_ids: Array<string>
): Promise<Array<FollowPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * from group_follow_approvals WHERE user_id = $1 AND group_id = ANY ($2)",
    [user_id, group_ids]
  );
  if (queryResult.rowCount == 0) {
    return [];
  }
  return queryResult.rows;
};
