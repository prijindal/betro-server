import { isEmpty, isNil } from "lodash";
import { ObjectLiteral, SelectQueryBuilder } from "typeorm";

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

export const UserPaginationWrapper = async <T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
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
  const totalCount = await queryBuilder.getCount();
  const limit = limitToInt(limitStr);
  let responseQuery = queryBuilder;
  if (after != null) {
    responseQuery = responseQuery.andWhere("created_at < :after", { after });
  }
  const response = await responseQuery
    .orderBy("created_at", "DESC")
    .limit(limit)
    .getMany();
  let afterCursor = null;
  if (response.length > 0) {
    afterCursor = response[response.length - 1].created_at;
  }
  const countAfterQuery = responseQuery;
  if (afterCursor != null) {
    countAfterQuery.andWhere("created_at < :after", { after: afterCursor });
  }
  const countAfter = await countAfterQuery.getCount();
  return {
    data: response,
    limit,
    total: totalCount,
    after: countAfter != 0 ? dateToBase64(afterCursor) : null,
    next: countAfter != 0,
  };
};
