import pool from "../src/db/postgres";

const cleanAllTables = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DROP TABLE IF EXISTS settings_notifications;");
    await client.query("DROP TABLE IF EXISTS user_notifications;");
    await client.query("DROP TYPE IF EXISTS settings_notification_action");
    await client.query("DROP TABLE IF EXISTS posts;");
    await client.query("DROP TABLE IF EXISTS group_follow_approvals;");
    await client.query("DROP TABLE IF EXISTS group_policies;");
    await client.query("DROP TABLE IF EXISTS user_profile;");
    await client.query("DROP TABLE IF EXISTS user_sym_keys;");
    await client.query("DROP TABLE IF EXISTS access_tokens;");
    await client.query("DROP TABLE IF EXISTS users;");
    await client.query("DROP TABLE IF EXISTS user_rsa_keys;");
    await client.query("DROP TABLE IF EXISTS migrations;");
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  process.exit();
};

cleanAllTables();
