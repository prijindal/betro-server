import {migrate, loadMigrationFiles} from "postgres-migrations"
import pool from "./index";

const runMigration = async () => {
  await pool.connect();
  try {
    await loadMigrationFiles("migrations");
    await migrate({client: pool}, "migrations")
  } catch(e) {
    console.error(e);
  } finally {
    process.exit()
  }
}

runMigration();
