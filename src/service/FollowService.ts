import postgres from "../db/postgres";
import { ApprovalPostgres } from "../interfaces/database/ApprovalPostgres";
import { FollowPostgres } from "../interfaces/database/FollowPostgres";

export const checkFollow = async (
  user_id: string,
  followee_id: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "SELECT id from group_follow_approvals WHERE user_id = $1 AND followee_id = $2",
    [user_id, followee_id]
  );
  return queryResult.rowCount == 1;
};

export const createFollow = async (
  user_id: string,
  followee_id: string,
  key_id: string
): Promise<FollowPostgres> => {
  const queryResult = await postgres.query(
    "INSERT INTO group_follow_approvals(user_id, followee_id, key_id) VALUES($1, $2, $3) RETURNING *",
    [user_id, followee_id, key_id]
  );
  if (queryResult.rowCount == 0) {
    throw new Error();
  }
  return queryResult.rows[0];
};

export const fetchPendingApprovals = async (
  user_id: string
): Promise<Array<ApprovalPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM group_follow_approvals WHERE followee_id = $1 AND is_approved=false",
    [user_id]
  );
  return queryResult.rows;
};

export const fetchFollowers = async (
  user_id: string
): Promise<Array<ApprovalPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM group_follow_approvals WHERE followee_id=$1",
    [user_id]
  );
  return queryResult.rows;
};

export const fetchFollowees = async (
  user_id: string
): Promise<Array<ApprovalPostgres>> => {
  const queryResult = await postgres.query(
    "SELECT * FROM group_follow_approvals WHERE user_id=$1",
    [user_id]
  );
  return queryResult.rows;
};

export const fetchPendingApproval = async (
  user_id: string,
  follow_id: string
): Promise<{ is_approved: boolean; id: string } | null> => {
  const queryResult = await postgres.query(
    "SELECT id,is_approved from group_follow_approvals WHERE followee_id = $1 AND id = $2",
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
  sym_key: string
): Promise<boolean> => {
  const queryResult = await postgres.query(
    "UPDATE group_follow_approvals SET is_approved=true,group_id=$1,sym_key=$2 WHERE followee_id=$3 AND id=$4",
    [group_id, sym_key, user_id, follow_id]
  );
  return queryResult.rowCount == 1;
};
