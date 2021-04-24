import pool from "../db/postgres";

const cleanAllTables = async () => {
  const trx = await pool.transaction();

  try {
    await trx.raw("BEGIN");
    await trx.raw("DROP TABLE IF EXISTS user_settings;");
    await trx.raw("DROP TABLE IF EXISTS user_notifications;");
    await trx.raw("DROP TYPE IF EXISTS user_settings_action");
    await trx.raw("DROP TABLE IF EXISTS posts;");
    await trx.raw("DROP TABLE IF EXISTS group_follow_approvals;");
    await trx.raw("DROP TABLE IF EXISTS group_policies;");
    await trx.raw("DROP TABLE IF EXISTS user_profile;");
    await trx.raw("DROP TABLE IF EXISTS user_sym_keys;");
    await trx.raw("DROP TABLE IF EXISTS access_tokens;");
    await trx.raw("DROP TABLE IF EXISTS users;");
    await trx.raw("DROP TABLE IF EXISTS user_rsa_keys;");
    await trx.raw("DROP TABLE IF EXISTS migrations;");
    await trx.commit();
  } catch (e) {
    await trx.rollback();
    throw e;
  }
  process.exit();
};

cleanAllTables();
