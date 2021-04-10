import pool from "../src/db/postgres";

const cleanAllTables = async () => {
  await pool.query("DROP TABLE IF EXISTS posts;");
  await pool.query("DROP TABLE IF EXISTS group_user_approvals;");
  await pool.query("DROP TABLE IF EXISTS group_policies;");
  await pool.query("DROP TABLE IF EXISTS user_sym_keys;");
  await pool.query("DROP TABLE IF EXISTS user_rsa_keys;");
  await pool.query("DROP TABLE IF EXISTS access_tokens;");
  await pool.query("DROP TABLE IF EXISTS users;");
  await pool.query("DROP TABLE IF EXISTS migrations;");
  process.exit();
};

cleanAllTables();
