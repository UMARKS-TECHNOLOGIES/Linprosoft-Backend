import { Pool } from "pg";
import { env } from "./environment";

const pool = new Pool({
    connectionString: env.DATABASE_URL,
})

export default pool;
