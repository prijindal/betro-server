import postgres from "../db/postgres";
import { throttle } from "throttle-debounce";

const userAccessedFn = async (access_token_id: string): Promise<void> => {
  try {
    const queryResult = await postgres.query(
      "UPDATE access_tokens SET accessed_at = NOW() WHERE id=$1",
      [access_token_id]
    );
  } catch (e) {
    console.error(e);
  }
};

export const userAccessed = throttle(10 * 1000, userAccessedFn);
