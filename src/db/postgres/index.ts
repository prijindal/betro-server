import { Pool } from "pg";
import { POSTGRES_URI } from "../../config";

const postgres = new Pool({ connectionString: POSTGRES_URI });

export default postgres;
