import postgres from "../db/postgres";
import { throttle } from "throttle-debounce";

const userAccessedFn = async (access_token_id: string): Promise<void> => {
  try {
    await postgres("access_tokens")
      .where({ id: access_token_id })
      .update({ accessed_at: postgres.fn.now() });
  } catch (e) {
    console.error(e);
  }
};

export const userAccessed = throttle(10 * 1000, userAccessedFn);
