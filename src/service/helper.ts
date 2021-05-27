import { isEmpty, isNil } from "lodash";
import { Knex } from "knex";
import postgres from "../db/postgres";

export const tableCount = async <T extends { id: string }>(
  table: string,
  where: Knex.DbRecord<Knex.ResolveTableType<T>> | WhereBuilder<T>
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

export const base64ToDate = (b64: string): Date | undefined => {
  if (!isNil(b64) && !isEmpty(b64)) {
    const date = new Date(Buffer.from(b64, "base64").toString("utf-8"));
    if (date instanceof Date && !isNaN(date.valueOf())) {
      return date;
    }
    return undefined;
  }
  return undefined;
};

export const dateToBase64 = (date: Date): string => {
  return Buffer.from(date.toISOString(), "utf-8").toString("base64");
};

export const limitToInt = (
  limitStr: string,
  default_value: number = 50
): number => {
  let limit: number;
  try {
    limit = parseInt(limitStr, 10);
  } catch (e) {
    limit = default_value;
  } finally {
    if (isNaN(limit)) {
      limit = default_value;
    }
  }
  return limit;
};

type WhereBuilder<T extends { id: string }> = (
  raw: Knex.QueryBuilder<T, any>
) => void;

export const UserPaginationWrapper = async <
  T extends { id: string; created_at: Date }
>(
  table: string,
  where: Knex.DbRecord<Knex.ResolveTableType<T>> | WhereBuilder<T>,
  limitStr: string,
  afterStr: string
): Promise<{
  data: Array<T>;
  limit: number;
  total: number;
  after: string;
  next: boolean;
}> => {
  const after: Date | undefined = base64ToDate(afterStr);
  const totalCount = await tableCount<T>(table, where);
  const limit = limitToInt(limitStr);
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
