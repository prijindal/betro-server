import { isEmpty } from "lodash";
import postgres from "../db/postgres";

export const fetchUserTableCount = async (
  user_id: string,
  table: string
): Promise<number> => {
  const queryResult = await postgres.query(
    `SELECT count(id) FROM ${table} WHERE user_id=$1`,
    [user_id]
  );
  return parseInt(queryResult.rows[0].count, 10);
};

export const UserPaginationWrapper = async <T extends { created_at: Date }>(
  fetchApi: (user_id: string, limit: number, after?: Date) => Promise<Array<T>>,
  fetchCountApi: (user_id: string, after?: Date) => Promise<number>,
  user_id: string,
  limitStr: string,
  after: string
): Promise<{
  data: Array<T>;
  limit: number;
  total: number;
  after: Date;
  next: boolean;
}> => {
  const totalCount = await fetchCountApi(user_id);
  let limit = 50;
  try {
    limit = parseInt(limitStr, 10);
  } catch (e) {
    limit = 50;
  } finally {
    if (isNaN(limit)) {
      limit = 50;
    }
  }
  let response: Array<T> = [];
  if (after != null && !isEmpty(after)) {
    try {
      response = await fetchApi(user_id, limit, new Date(after));
    } catch (e) {
      response = await fetchApi(user_id, limit);
    }
  } else {
    response = await fetchApi(user_id, limit);
  }
  let afterCursor = null;
  if (response.length > 0) {
    afterCursor = response[response.length - 1].created_at;
  }
  let countAfter: number;
  try {
    countAfter = await fetchCountApi(user_id, afterCursor);
  } catch (e) {
    countAfter = await fetchCountApi(user_id);
  }
  return {
    data: response,
    limit,
    total: totalCount,
    after: countAfter != 0 ? afterCursor : null,
    next: countAfter != 0,
  };
};
