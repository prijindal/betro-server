import knex from "knex";
import { POSTGRES_URI } from "../../config";

const postgres = knex({
  client: "pg",
  connection: POSTGRES_URI,
  pool: { min: 0, max: 7 },
});

export default postgres;
