import { isEmpty, isNil } from "lodash";
import { Knex } from "knex";
import postgres from "../db/postgres";

export const tableCount = async <T extends { id: string }>(
  table: string,
  where: Knex.DbRecord<Knex.ResolveTableType<T>>
): Promise<number> => {
  const queryResult = await postgres<T>(table)
    .where(where)
    .count<Array<Record<"count", string>>>("id");
  try {
    return parseInt(queryResult[0].count, 10);
  } catch (e) {
    return 0;
  }
};

const base64ToDate = (b64: string): Date | undefined => {
  const date = new Date(Buffer.from(b64, "base64").toString("utf-8"));
  if (date instanceof Date && !isNaN(date.valueOf())) {
    return date;
  }
  return undefined;
};

const dateToBase64 = (date: Date): string => {
  return Buffer.from(date.toISOString(), "utf-8").toString("base64");
};

export const UserPaginationWrapper = async <
  T extends { id: string; created_at: Date }
>(
  table: string,
  where: Knex.DbRecord<Knex.ResolveTableType<T>>,
  limitStr: string,
  afterStr: string
): Promise<{
  data: Array<T>;
  limit: number;
  total: number;
  after: string;
  next: boolean;
}> => {
  let after: Date | undefined;
  if (afterStr != null && !isNil(afterStr) && !isEmpty(afterStr)) {
    after = base64ToDate(afterStr);
  }
  const totalCount = await tableCount<T>(table, where);
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
  const responseQuery: Knex.QueryBuilder<T> = postgres<T>(table)
    .select("*")
    .orderBy("created_at", "desc")
    .limit(limit)
    .where(where);
  if (after != null) {
    responseQuery.where("created_at", "<", after);
  }
  const response = await responseQuery;
  let afterCursor = null;
  if (response.length > 0) {
    afterCursor = response[response.length - 1].created_at;
  }
  const countAfterQuery = postgres<T>(table)
    .count<Array<Record<"count", string>>>("id")
    .where(where);
  if (afterCursor != null) {
    countAfterQuery.where("created_at", "<", afterCursor);
  }
  const countAfterResponse = await countAfterQuery;
  const countAfter = parseInt(countAfterResponse[0].count, 10);
  return {
    data: response,
    limit,
    total: totalCount,
    after: countAfter != 0 ? dateToBase64(afterCursor) : null,
    next: countAfter != 0,
  };
};
