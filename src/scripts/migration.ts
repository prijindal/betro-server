import { migrate, loadMigrationFiles } from "postgres-migrations";
import { Pool } from "pg";
import { POSTGRES_URI } from "../config";

const pool = new Pool({ connectionString: POSTGRES_URI });

const runMigration = async () => {
  await pool.connect();
  try {
    await loadMigrationFiles("migrations");
    await migrate({ client: pool }, "migrations");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
};

runMigration();
