import { isEmpty } from "lodash";
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

export const UserPaginationWrapper = async <
  T extends { id: string; created_at: Date }
>(
  table: string,
  where: Knex.DbRecord<Knex.ResolveTableType<T>>,
  limitStr: string,
  after: string
): Promise<{
  data: Array<T>;
  limit: number;
  total: number;
  after: Date;
  next: boolean;
}> => {
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
  let response: Array<T> = [];
  const responseQuery: Knex.QueryBuilder<T> = postgres<T>(table)
    .select("*")
    .where(where);
  if (after != null && !isEmpty(after)) {
    responseQuery.where("created_at", "<", after);
  }
  response = await responseQuery;
  let afterCursor = null;
  if (response.length > 0) {
    afterCursor = response[response.length - 1].created_at;
  }
  const countAfterQuery = postgres<T>(table)
    .count<Array<Record<"count", string>>>("id")
    .where(where);
  if (after != null && !isEmpty(after)) {
    countAfterQuery.where("created_at", "<", after);
  }
  const countAfterResponse = await countAfterQuery;
  const countAfter = parseInt(countAfterResponse[0].count, 10);
  return {
    data: response,
    limit,
    total: totalCount,
    after: countAfter != 0 ? afterCursor : null,
    next: countAfter != 0,
  };
};
