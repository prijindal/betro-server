import { throttle } from "throttle-debounce";
import { logger } from "../config";
import postgres from "../db/postgres";

const userAccessedFn = async (access_token_id: string): Promise<void> => {
  try {
    await postgres("access_tokens")
      .where({ id: access_token_id })
      .update({ accessed_at: postgres.fn.now() });
  } catch (e) {
    logger.error(e);
  }
};

export const userAccessed = throttle(10 * 1000, userAccessedFn);
